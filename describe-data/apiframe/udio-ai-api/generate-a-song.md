> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/udio-ai-api/generate-a-song.md).

# Generate a song

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/udio-generate`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="239">Name</th><th width="92">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>prompt</code><mark style="color:$danger;"><code>*</code></mark></td><td>string</td><td>Description/style for the song (e.g., "night breeze, piano", "jazz, pop"). Max 2000 characters.</td></tr><tr><td><code>lyrics</code></td><td>string</td><td>Full lyrics when lyrics_type is "user". Max 5000 characters.</td></tr><tr><td><code>lyrics_type</code></td><td>string</td><td><strong>generate</strong> (AI writes lyrics), <strong>user</strong> (use provided lyrics), or <strong>instrumental</strong> (no lyrics). Default: generate</td></tr><tr><td><code>negative_tags</code></td><td>string</td><td>Tags to avoid, comma-separated (e.g., "pop,rock"). Max 500 characters.</td></tr><tr><td><code>seed</code></td><td>string</td><td>Seed for reproducibility. Use -1 for random.</td></tr><tr><td><code>webhook_url</code></td><td>string</td><td>The final result and updates of this task will be posted at this URL.</td></tr><tr><td><code>webhook_secret</code></td><td>string</td><td>Will be passed as <code>x-webhook-secret</code> in the webhook call headers for authentication.</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
// Success, the task has been submitted
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
// Invalid API Key
{}
```

{% endtab %}

{% tab title="500" %}

```json
// A server error occured
{}
```

{% endtab %}
{% endtabs %}

This endpoint doesn't generate the songs instantly, you can use the [Fetch](/api-endpoints/fetch.md) endpoint to fetch the result or use [webhooks](/webhooks.md).

The result (posted to the `webhook_url` or retrieved with the [Fetch](/api-endpoints/fetch.md) endpoint) looks like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-xxxxxxxxx",
    "task_type": "udio-generate",
    "status": "finished",
    "songs": [
      {
        "lyrics": "....",
        "song_id": "ea6813ad-03ce-4a0b-a616-xxxxxxxxx",
        "audio_url": "https://....xxxxxxxxx.mp3",
        "image_url": "https://....xxxxxxxxx.jpeg",
      },
      {
        "lyrics": "...",
        "song_id": "21ad7efc-4954-4ae4-ae2a-xxxxxxxx",
        "audio_url": "https://....xxxxxxxxx.mp3",
        "image_url": "https://....xxxxxxxxx.jpeg",
      }
  ]
}
```

If the job is not completed, you will get a result like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-xxxxxxxxx",
    "task_type": "udio-generate",
    "status": "processing",
    "percentage": 56,
    "songs": [
      {
        "lyrics": "....",
        "song_id": "ea6813ad-03ce-4a0b-a616-xxxxxxxxx",
        "audio_url": null",
        "image_url": "https://....xxxxxxxxx.jpeg",
      },
      {
        "lyrics": "...",
        "song_id": "21ad7efc-4954-4ae4-ae2a-xxxxxxxx",
        "audio_url": null,
        "image_url": "https://....xxxxxxxxx.jpeg",
      }
  ]
}
```
