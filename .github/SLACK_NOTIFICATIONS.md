# Slack Notifications Setup

This repository is configured to send CI build notifications to Slack.

## Setup Instructions

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Give it a name (e.g., "GitHub CI Notifications")
5. Select your workspace

### 2. Enable Incoming Webhooks

1. In your app settings, navigate to "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to On
3. Click "Add New Webhook to Workspace"
4. Select the channel where you want notifications to appear
5. Click "Allow"
6. Copy the Webhook URL (it will look like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)

### 3. Add Webhook to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Paste the webhook URL from step 2
6. Click "Add secret"

## Notification Format

The CI workflow will send a Slack notification on every build (success or failure) with:

- Repository name
- Branch name
- Workflow name
- Build status (success/failure)
- Commit SHA and link
- Author
- Link to view the workflow run

## Testing

To test the Slack notification:

1. Make sure `SLACK_WEBHOOK_URL` secret is configured
2. Push a commit or create a pull request
3. Check your configured Slack channel for the notification

## Troubleshooting

### No notifications appearing

- Verify the `SLACK_WEBHOOK_URL` secret is set correctly in GitHub repository settings
- Ensure the webhook URL hasn't been revoked in Slack
- Check that your Slack app has permission to post to the selected channel
- Review the workflow run logs in GitHub Actions for any error messages

### Notifications going to wrong channel

- In Slack, go to your app settings
- Under "Incoming Webhooks", you can add webhooks for different channels
- Update the `SLACK_WEBHOOK_URL` secret in GitHub with the correct webhook URL

## Customization

The notification payload can be customized in `.github/workflows/ci.yml` under the "Slack Notification" step. The current implementation uses Slack's Block Kit format for rich formatting.

For more information on Slack Block Kit, see: [https://api.slack.com/block-kit](https://api.slack.com/block-kit)
