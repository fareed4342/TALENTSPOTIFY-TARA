# Vapi Configuration Guide for Tara Assistant

## Step-by-Step Vapi Dashboard Configuration

### 1. Create the Assistant

1. Log in to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Click "Create Assistant"
3. Name: **Tara**
4. Description: **HR Performance Review Voice Assistant**

### 2. Configure Voice Settings

**Voice Provider:** Choose your preferred provider (e.g., ElevenLabs, Play.ht)
**Voice:** Select a professional, friendly female voice
**Speed:** 1.0 (normal)
**Stability:** 0.5-0.7 (balanced)

### 3. System Prompt

Add this comprehensive system prompt:

```
You are Tara, a professional HR performance review voice assistant for TalentSpotify. Your role is to conduct structured, empathetic, and thorough performance evaluations.

IMPORTANT: At the start of every conversation during Introduction & Consent:
1. Ask for the employee's full name
2. Ask for the manager's full name
3. Once you have BOTH names confirmed, immediately call the setParticipants tool with both names

Performance Review Structure:
1. Introduction & Consent (2-3 minutes)
   - Greet warmly
   - Ask for employee and manager names
   - Call setParticipants tool once names are confirmed
   - Explain the review process
   - Obtain verbal consent to proceed
   - Confirm understanding of confidentiality

2. Performance Discussion (10-15 minutes)
   - Ask about key accomplishments
   - Discuss challenges faced
   - Explore goal achievement
   - Review feedback received
   - Listen actively and ask follow-up questions

3. Development & Goals (5-7 minutes)
   - Identify growth areas
   - Discuss career aspirations
   - Set actionable goals
   - Plan development opportunities

4. Closing (2-3 minutes)
   - Summarize key points
   - Confirm next steps
   - Thank for participation
   - Offer final questions

Communication Style:
- Professional yet warm and approachable
- Active listening with empathetic responses
- Clear and concise questions
- Encourage detailed responses
- Maintain positive tone throughout
- Adapt pace to user comfort level

Remember: Always call setParticipants immediately after learning both names!
```

### 4. Configure Messages

Navigate to **Settings → Messages**

#### Enable Client Messages:
- ✅ transcript
- ✅ conversation-update
- ✅ status-update
- ✅ function-call

#### Enable Server Messages:
- ✅ transcript
- ✅ conversation-update
- ✅ end-of-call-report
- ✅ tool-calls
- ✅ function-call

### 5. Add Tools

Navigate to **Tools** section and add:

```json
{
  "type": "function",
  "function": {
    "name": "setParticipants",
    "description": "Store the employee and manager names for this performance review session. Call this immediately after confirming both names during the introduction.",
    "parameters": {
      "type": "object",
      "properties": {
        "employeeName": {
          "type": "string",
          "description": "The full name of the employee being reviewed"
        },
        "managerName": {
          "type": "string",
          "description": "The full name of the manager conducting the review"
        }
      },
      "required": ["employeeName", "managerName"]
    }
  }
}
```

### 6. Configure Server URL

Navigate to **Settings → Server URL**

**Development:**
```
http://localhost:5000/api/v1/vapi/webhook
```

**Production:**
```
https://your-domain.com/api/v1/vapi/webhook
```

> Note: For local development, use [ngrok](https://ngrok.com/) to expose your local server:
> ```bash
> ngrok http 5000
> ```

### 7. Configure Webhook Secret

1. Go to **Settings → Webhook**
2. Generate a webhook secret
3. Copy the secret to your `server/.env` file as `VAPI_WEBHOOK_SECRET`

### 8. Model Configuration

**Model:** gpt-4 or gpt-3.5-turbo
**Temperature:** 0.7 (balanced creativity)
**Max Tokens:** 150-200 (for natural responses)

### 9. Advanced Settings

**End of Speech Detection:**
- Threshold: 0.5 seconds
- This allows natural pauses in conversation

**Background Sound:**
- Enable office ambiance (optional, for realism)
- Volume: 0.1-0.2 (subtle)

**First Message:**
```
Hello! I'm Tara, your performance review assistant. Before we begin, may I have your full name please?
```

### 10. Test Your Assistant

1. Click **Test** in the dashboard
2. Allow microphone access
3. Test the conversation flow:
   - Provide employee name
   - Provide manager name
   - Verify tool call is triggered
   - Continue with performance discussion

### 11. Get API Keys

#### Public Key (Frontend):
1. Go to **Settings → API Keys**
2. Copy **Public Key**
3. Add to frontend `.env` as `VITE_VAPI_PUBLIC_KEY`

#### Server Key (Backend):
1. Copy **Private Key**
2. Add to `server/.env` as `VAPI_API_KEY`

#### Assistant ID:
1. Copy the assistant ID from the URL or settings
2. Add to frontend `.env` as `VITE_VAPI_ASSISTANT_ID`

## Verification Checklist

Before going live, verify:

- [ ] System prompt includes setParticipants instruction
- [ ] setParticipants tool is added correctly
- [ ] Client messages include transcript, conversation-update
- [ ] Server messages include transcript, tool-calls, end-of-call-report
- [ ] Webhook URL is configured and accessible
- [ ] Webhook secret is set in backend .env
- [ ] Public key is set in frontend .env
- [ ] Assistant ID is set in frontend .env
- [ ] Test call successfully triggers setParticipants
- [ ] Transcripts are received in real-time
- [ ] End-of-call webhook receives recording URL

## Testing the Tool Call

Create a test call and say:
```
"My name is John Smith"
(wait for response)
"The manager is Sarah Johnson"
```

You should see in your backend logs:
```
👥 Participants set: {'employeeName': 'John Smith', 'managerName': 'Sarah Johnson'}
```

## Troubleshooting

### Tool Not Being Called
- Verify the tool is added in Vapi dashboard
- Check system prompt mentions calling the tool
- Ensure names are clearly stated during conversation
- Review conversation logs in Vapi dashboard

### Transcripts Not Updating
- Verify transcript messages are enabled
- Check WebSocket connection in browser console
- Ensure client messages include 'transcript'
- Test with different browsers

### Webhook Not Receiving Events
- Verify webhook URL is publicly accessible
- Check webhook signature verification
- Review Flask server logs
- Test webhook with Postman or curl

### Recording Not Saved
- Verify end-of-call-report is enabled in server messages
- Check S3 permissions and credentials
- Review backend logs for S3 upload errors
- Ensure recording is enabled in Vapi settings

## Production Recommendations

1. **Use HTTPS** for webhook URL (required in production)
2. **Enable webhook signature verification** (already implemented)
3. **Monitor webhook response times** (Vapi timeout is 10s)
4. **Set up error logging** for failed webhook calls
5. **Test with multiple users** to ensure scalability
6. **Keep assistant prompt updated** based on user feedback

## Support Resources

- [Vapi Documentation](https://docs.vapi.ai)
- [Vapi API Reference](https://docs.vapi.ai/api-reference)
- [Vapi Discord Community](https://discord.gg/vapi)
- [Vapi Status Page](https://status.vapi.ai)
