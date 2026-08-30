> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/pro-midjourney-api/api-endpoints/seed.md).

# Seed

<mark style="color:green;">`POST`</mark> `https://api.apiframe.ai/pro/seed`

**Headers**

| Name                                            | Value                   |
| ----------------------------------------------- | ----------------------- |
| Content-Type                                    | `application/json`      |
| Authorization<mark style="color:red;">\*</mark> | `Your APIFRAME API Key` |

**Body**

<table><thead><tr><th width="196.8828125">Name</th><th width="133.4296875">Type</th><th width="417.84375">Description</th></tr></thead><tbody><tr><td><code>task_id</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>The task ID of the original task</td></tr><tr><td><code>webhook_url</code></td><td>string</td><td>Task updates will be posted at this URL</td></tr><tr><td><code>webhook_secret</code></td><td>string</td><td>Will be passed as <code>x-webhook-secret</code> in the webhook call headers for authentication.</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
// Success
{
  "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a"
}
```

{% endtab %}

{% tab title="400" %}

```json
// Bad request
{
  "errors": [{ msg: "Invalid request" }]
}
```

{% endtab %}

{% tab title="401" %}

```json
// Unauthorized
```

{% endtab %}
{% endtabs %}

This endpoint doesn't generate the seed instantly; You can use the [Fetch](https://docs.apiframe.ai/api-endpoints/fetch) endpoint to fetch the result or [webhooks](https://docs.apiframe.ai/webhooks).
