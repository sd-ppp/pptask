> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/webhooks.md).

# Webhooks

The recommended way to receive updates about your tasks is to use Webhooks.

Status updates and final results will be sent to the `webhook_url` you set in the request. You can use the `webhook_secret`  parameter to ensure that the updates are actually coming from us; it will be passed as `x-webhook-secret` in the webhook call headers for authentication.
