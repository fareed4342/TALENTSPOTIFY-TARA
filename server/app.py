from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import json
import os
import requests
import hmac
import hashlib
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Config
VAPI_API_KEY = os.environ.get('VAPI_API_KEY')
VAPI_WEBHOOK_SECRET = os.environ.get('VAPI_WEBHOOK_SECRET')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
S3_BUCKET = os.environ.get('S3_BUCKET')
S3_PREFIX = os.environ.get('S3_PREFIX', 'sessions/')

# Talentspotify API config
TALENTSPOTIFY_BASE_URL = os.environ.get('TALENTSPOTIFY_BASE_URL')
TALENTSPOTIFY_API_KEY = os.environ.get('TALENTSPOTIFY_API_KEY')

s3_client = boto3.client('s3', region_name=AWS_REGION)

# In-memory cache for call data
call_cache = {}

# In-memory sessions store for history (fallback when S3 not configured)
local_sessions = {}

def verify_vapi_signature(request):
    """Verify webhook signature from Vapi"""
    signature = request.headers.get('X-Vapi-Signature')
    if not signature or not VAPI_WEBHOOK_SECRET:
        return False
    
    body = request.get_data(as_text=True)
    expected = hmac.new(
        VAPI_WEBHOOK_SECRET.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

@app.route('/api/v1/vapi/webhook', methods=['POST'])
def vapi_webhook():
    """Receive events from Vapi"""
    if not verify_vapi_signature(request):
        return jsonify({'error': 'Invalid signature'}), 403
    
    data = request.json
    event_type = data.get('message', {}).get('type')
    call_id = data.get('message', {}).get('call', {}).get('id')
    
    if not call_id:
        return jsonify({'status': 'ignored'}), 200
    
    # Initialize cache for this call
    if call_id not in call_cache:
        call_cache[call_id] = {'participants': {}, 'recording_url': None}
    
    # Handle tool-calls for participant names
    if event_type == 'tool-calls':
        tool_call = data.get('message', {}).get('toolCalls', [{}])[0]
        if tool_call.get('function', {}).get('name') == 'setParticipants':
            args = tool_call.get('function', {}).get('arguments', {})
            call_cache[call_id]['participants'] = {
                'employeeName': args.get('employeeName'),
                'managerName': args.get('managerName')
            }
    
    # Handle end-of-call-report
    elif event_type == 'end-of-call-report':
        recording_url = data.get('message', {}).get('recordingUrl')
        stereo_url = data.get('message', {}).get('stereoRecordingUrl')
        call_cache[call_id]['recording_url'] = recording_url or stereo_url
    
    return jsonify({'status': 'received'}), 200

@app.route('/api/sessions/finalize', methods=['POST'])
def finalize_session():
    """Save call transcript and recording to S3"""
    data = request.json
    call_id = data.get('callId')
    
    if not call_id:
        return jsonify({'error': 'callId required'}), 400
    
    # Get cached participant data
    cached = call_cache.get(call_id, {})
    participants = data.get('participants', cached.get('participants', {}))
    
    employee_name = participants.get('employeeName', 'Unknown Employee')
    manager_name = participants.get('managerName', 'Unknown Manager')
    
    transcript = data.get('transcript', [])
    started_at = data.get('startedAt')
    ended_at = data.get('endedAt')
    
    # Fetch recording URL if not in cache
    recording_url = cached.get('recording_url')
    if not recording_url and VAPI_API_KEY:
        try:
            resp = requests.get(
                f'https://api.vapi.ai/call/{call_id}',
                headers={'Authorization': f'Bearer {VAPI_API_KEY}'}
            )
            if resp.status_code == 200:
                call_data = resp.json()
                recording_url = call_data.get('recordingUrl') or call_data.get('stereoRecordingUrl')
        except Exception as e:
            print(f'Error fetching call data: {e}')
    
    # Prepare metadata
    metadata = {
        'callId': call_id,
        'employeeName': employee_name,
        'managerName': manager_name,
        'startedAt': started_at,
        'endedAt': ended_at,
        'duration': (ended_at - started_at) if (started_at and ended_at) else None,
        'messageCount': len(transcript),
        'recordingUrl': recording_url
    }
    
    # 3. Transcript TXT (string)
    txt_lines = []
    for msg in transcript:
        if msg.get('isFinal', True):
            speaker = 'Tara' if msg['role'] == 'agent' else 'You'
            txt_lines.append(f"{speaker}: {msg['text']}\n")

    # Save in-memory copy for history (always)
    local_sessions[call_id] = {
        'metadata': metadata,
        'transcript': transcript,
        'recordingUrl': recording_url
    }

    # Save to S3 if configured, but don't block local save on errors
    if S3_BUCKET:
        try:
            base_key = f'{S3_PREFIX}{call_id}/'
            # 1. Metadata
            s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=f'{base_key}metadata.json',
                Body=json.dumps(metadata, indent=2),
                ContentType='application/json'
            )
            # 2. Transcript JSON
            s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=f'{base_key}transcript.json',
                Body=json.dumps(transcript, indent=2),
                ContentType='application/json'
            )
            # 3. Transcript TXT
            s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=f'{base_key}transcript.txt',
                Body=''.join(txt_lines),
                ContentType='text/plain'
            )
            # 4. Download and save recording if URL exists
            if recording_url:
                try:
                    audio_resp = requests.get(recording_url)
                    if audio_resp.status_code == 200:
                        ext = 'mp3' if 'mp3' in recording_url else 'wav'
                        s3_client.put_object(
                            Bucket=S3_BUCKET,
                            Key=f'{base_key}recording.{ext}',
                            Body=audio_resp.content,
                            ContentType=f'audio/{ext}'
                        )
                except Exception as e:
                    print(f'Error downloading recording: {e}')
        except Exception as e:
            # Log and continue returning success for local history
            print(f'S3 upload failed: {e}')
    
    # Clean up cache
    if call_id in call_cache:
        del call_cache[call_id]
    
    return jsonify({'status': 'saved', 'callId': call_id}), 200


@app.route('/api/okr', methods=['GET'])
def get_okrs_by_email():
    """Proxy to Talentspotify to fetch Objectives and Key Results by user email.

    Query Params:
      - email: user email address used as identifier

    Environment variables required:
      - TALENTSPOTIFY_BASE_URL: Base API URL, e.g., https://api.talentspotify.com
      - TALENTSPOTIFY_API_KEY: Bearer/API key if required by Talentspotify
    """
    email = request.args.get('email', '').strip()
    if not email:
        return jsonify({'error': 'email is required'}), 400

    if not TALENTSPOTIFY_BASE_URL:
        return jsonify({'error': 'Server is not configured for Talentspotify (missing TALENTSPOTIFY_BASE_URL)'}), 500

    try:
        # Example endpoint – adjust the path/params to match Talentspotify's API
        url = f"{TALENTSPOTIFY_BASE_URL.rstrip('/')}/okr"
        headers = {'Accept': 'application/json'}
        if TALENTSPOTIFY_API_KEY:
            headers['Authorization'] = f"Bearer {TALENTSPOTIFY_API_KEY}"

        resp = requests.get(url, params={'email': email}, headers=headers, timeout=15)
        if resp.status_code >= 400:
            return jsonify({'error': 'Talentspotify request failed', 'status': resp.status_code, 'body': resp.text}), 502

        data = resp.json()

        # Optionally normalize into a compact summary string for voice prompt
        objectives = data.get('objectives') or data.get('OKRs') or []
        summary_parts = []
        for idx, obj in enumerate(objectives, start=1):
            title = obj.get('title') or obj.get('objective') or f'Objective {idx}'
            key_results = obj.get('keyResults') or obj.get('key_results') or []
            kr_summaries = []
            for jdx, kr in enumerate(key_results, start=1):
                kr_title = kr.get('title') or kr.get('keyResult') or f'KR {jdx}'
                progress = kr.get('progress') or kr.get('percent')
                if progress is not None:
                    kr_summaries.append(f"KR{jdx}: {kr_title} ({progress}%)")
                else:
                    kr_summaries.append(f"KR{jdx}: {kr_title}")
            if kr_summaries:
                summary_parts.append(f"Objective {idx}: {title}. " + "; ".join(kr_summaries))
            else:
                summary_parts.append(f"Objective {idx}: {title}.")

        okr_summary = \
            ("Here are the user's Objectives and Key Results: " + " | ".join(summary_parts)) \
            if summary_parts else "No OKRs found for this user."

        return jsonify({'raw': data, 'summary': okr_summary}), 200
    except requests.Timeout:
        return jsonify({'error': 'Talentspotify request timed out'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """List all past sessions from S3 or local in-memory fallback"""
    try:
        # If S3 is not configured, return local sessions
        if not S3_BUCKET:
            sessions = []
            for call_id, sess in local_sessions.items():
                meta = sess.get('metadata', {})
                sessions.append({
                    'callId': call_id,
                    'employeeName': meta.get('employeeName'),
                    'managerName': meta.get('managerName'),
                    'startedAt': meta.get('startedAt'),
                    'endedAt': meta.get('endedAt'),
                    'duration': meta.get('duration'),
                })
            sessions.sort(key=lambda x: x.get('startedAt', 0), reverse=True)
            return jsonify(sessions), 200

        # Otherwise, use S3 and merge with local sessions
        sessions = []
        # Seed with local
        for call_id, sess in local_sessions.items():
            meta = sess.get('metadata', {})
            sessions.append({
                'callId': call_id,
                'employeeName': meta.get('employeeName'),
                'managerName': meta.get('managerName'),
                'startedAt': meta.get('startedAt'),
                'endedAt': meta.get('endedAt'),
                'duration': meta.get('duration'),
            })

        try:
            paginator = s3_client.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=S3_PREFIX, Delimiter='/'):
                for prefix in page.get('CommonPrefixes', []):
                    folder = prefix['Prefix']
                    call_id = folder.rstrip('/').split('/')[-1]

                    # Read metadata
                    try:
                        obj = s3_client.get_object(Bucket=S3_BUCKET, Key=f'{folder}metadata.json')
                        metadata = json.loads(obj['Body'].read())
                        if not any(s.get('callId') == call_id for s in sessions):
                            sessions.append({
                                'callId': call_id,
                                'employeeName': metadata.get('employeeName'),
                                'managerName': metadata.get('managerName'),
                                'startedAt': metadata.get('startedAt'),
                                'endedAt': metadata.get('endedAt'),
                                'duration': metadata.get('duration')
                            })
                    except:
                        continue
        except Exception as e:
            print(f'Failed to list S3 history, falling back to local only: {e}')

        sessions.sort(key=lambda x: x.get('startedAt', 0), reverse=True)
        return jsonify(sessions), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<call_id>', methods=['GET'])
def get_session_detail(call_id):
    """Get full transcript and metadata for a session from S3 or local fallback"""
    try:
        # If S3 is not configured, return local session
        if not S3_BUCKET:
            sess = local_sessions.get(call_id)
            if not sess:
                return jsonify({'error': 'Session not found'}), 404
            return jsonify({
                'metadata': sess.get('metadata', {}),
                'transcript': sess.get('transcript', []),
                'recordingUrl': sess.get('recordingUrl', None)
            }), 200

        try:
            base_key = f'{S3_PREFIX}{call_id}/'

            # Get metadata
            meta_obj = s3_client.get_object(Bucket=S3_BUCKET, Key=f'{base_key}metadata.json')
            metadata = json.loads(meta_obj['Body'].read())

            # Get transcript
            trans_obj = s3_client.get_object(Bucket=S3_BUCKET, Key=f'{base_key}transcript.json')
            transcript = json.loads(trans_obj['Body'].read())

            # Generate presigned URL for recording if exists
            recording_url = None
            recording_key = None
            for ext in ['mp3', 'wav']:
                try:
                    s3_client.head_object(Bucket=S3_BUCKET, Key=f'{base_key}recording.{ext}')
                    recording_key = f'{base_key}recording.{ext}'
                    break
                except:
                    continue

            if recording_key:
                recording_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': S3_BUCKET, 'Key': recording_key},
                    ExpiresIn=600  # 10 minutes
                )

            return jsonify({
                'metadata': metadata,
                'transcript': transcript,
                'recordingUrl': recording_url
            }), 200
        except Exception as e:
            print(f'Failed to load session from S3, trying local: {e}')
            sess = local_sessions.get(call_id)
            if not sess:
                return jsonify({'error': 'Session not found'}), 404
            return jsonify({
                'metadata': sess.get('metadata', {}),
                'transcript': sess.get('transcript', []),
                'recordingUrl': sess.get('recordingUrl', None)
            }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
