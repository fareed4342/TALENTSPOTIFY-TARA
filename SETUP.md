# TalentSpotify Tara Voice Assistant Setup Guide

## Overview
This is a complete voice-enabled HR performance review assistant built with React, Vapi.ai, and AWS S3 for transcript storage.

## Features
- 🎙️ Voice-based performance reviews with Tara AI assistant
- 📝 Live transcript panel during calls
- 📊 History page showing past sessions
- ☁️ Auto-save transcripts and recordings to AWS S3
- 👥 Automatic capture of employee and manager names

## Frontend Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_VAPI_PUBLIC_KEY=your_public_key_here
VITE_VAPI_ASSISTANT_ID=your_assistant_id_here
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Run Development Server
```bash
npm run dev
```

## Backend Setup

### 1. Install Python Dependencies
```bash
cd server
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the `server` directory:
```env
VAPI_API_KEY=your_vapi_server_key
VAPI_WEBHOOK_SECRET=your_webhook_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_PREFIX=sessions/
PORT=5000
```

### 3. Run Flask Server
```bash
python app.py
```

The server will run on http://localhost:5000

## Vapi Configuration

### 1. Create Assistant
1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Create a new assistant named "Tara"
3. Copy the Assistant ID to your `.env` file

### 2. Configure Messages
In your assistant settings, enable these messages:

**Client Messages:**
- transcript
- conversation-update
- status-update

**Server Messages:**
- transcript
- conversation-update
- end-of-call-report
- tool-calls

### 3. Set Webhook URL
Set Server URL to: `https://your-backend-url/api/v1/vapi/webhook`

### 4. Add Tool for Participant Names
Add this tool definition:
```json
{
  "type": "function",
  "function": {
    "name": "setParticipants",
    "description": "Store employee and manager names once confirmed",
    "parameters": {
      "type": "object",
      "properties": {
        "employeeName": {
          "type": "string",
          "description": "The name of the employee being reviewed"
        },
        "managerName": {
          "type": "string",
          "description": "The name of the manager conducting the review"
        }
      },
      "required": ["employeeName", "managerName"]
    }
  }
}
```

### 5. Update System Prompt
Add to your assistant's system prompt:
```
During the Introduction & Consent phase, once you learn the employee and manager names, immediately call the setParticipants tool with both names.
```

## AWS S3 Setup

### 1. Create S3 Bucket
1. Go to AWS Console → S3
2. Create a new bucket (e.g., `talentspotify-sessions`)
3. Note the bucket name for your `.env` file

### 2. Configure IAM Permissions
Create an IAM user with this policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

### 3. Get Access Keys
1. Create access keys for the IAM user
2. Add them to your `server/.env` file

## Testing the Application

### 1. Start Backend
```bash
cd server
python app.py
```

### 2. Start Frontend
```bash
npm run dev
```

### 3. Test Voice Call
1. Open http://localhost:8080
2. Click "Connect with Tara"
3. Allow microphone access
4. Start speaking with Tara

### 4. Test Transcript Panel
- During a call, click the ScrollText icon to view live transcripts
- Transcripts update in real-time
- Download as TXT or JSON

### 5. Test History
- After ending a call, navigate to History
- View past sessions
- Click on a session to see full transcript and play recording

## Production Deployment

### Frontend
Deploy to Vercel, Netlify, or any static hosting:
```bash
npm run build
```

### Backend
Deploy to AWS EC2, Heroku, or any Python hosting platform.

Update your `.env` files with production URLs and credentials.

## Troubleshooting

### Microphone Not Working
- Ensure HTTPS in production (required for microphone access)
- Check browser permissions
- Test with different browsers

### Transcripts Not Showing
- Verify Vapi client messages are enabled
- Check browser console for errors
- Ensure assistant is configured to send transcripts

### S3 Upload Failing
- Verify AWS credentials
- Check bucket permissions
- Ensure bucket name is correct in `.env`

### Webhook Not Receiving Events
- Verify webhook URL is publicly accessible
- Check webhook signature verification
- Test with ngrok for local development

## Support
For issues or questions, refer to:
- [Vapi Documentation](https://docs.vapi.ai)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Flask Documentation](https://flask.palletsprojects.com/)
