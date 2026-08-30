> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/wan-video.md).

# WAN VIDEO

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/wan-imagine`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="200">Name</th><th width="92">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>prompt</code></td><td>string</td><td>Text description of the desired video. Max 1500 characters. Required for <code>wan2.6-flash</code>, optional otherwise</td></tr><tr><td><code>model</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>One of: <code>wan2.5</code>, <code>wan2.6</code>, <code>wan2.6-flash</code></td></tr><tr><td><code>negative_prompt</code></td><td>string</td><td>Content to exclude from the video. Max 500 characters.</td></tr><tr><td><code>image_url</code></td><td>string</td><td><p>URL of the first-frame image. Providing this switches to image-to-video mode. Supported formats: JPEG, PNG, BMP, WEBP. Max 10 MB.</p><p><br>Required for <code>wan2.6-flash</code>, optional otherwise</p></td></tr><tr><td><code>audio_url</code></td><td>boolean</td><td>URL of an audio file to synchronize with the video. Supported formats: WAV, MP3. Duration: 3-30 seconds. Max 15 MB.</td></tr><tr><td><code>resolution</code></td><td>string</td><td><code>480P</code>, <code>720P</code>, or <code>1080P</code>. Availability depends on model (see table below). 480P for Wan2.5 only</td></tr><tr><td><code>duration</code></td><td>integer</td><td>Video duration in seconds. Range depends on model.<br>2-15 for Any 2.6 model and 5 or 10 for Wan2.5.</td></tr><tr><td><code>webhook_url</code></td><td>string</td><td>The final result and updates of this task will be posted at this URL.</td></tr><tr><td><code>webhook_secret</code></td><td>string</td><td>Will be passed as <code>x-webhook-secret</code> in the webhook call headers for authentication.</td></tr></tbody></table>

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

This endpoint doesn't generate the video instantly, you can use the [Fetch](/api-endpoints/fetch.md) endpoint to fetch the result or use [webhooks](/webhooks.md).

The result (posted to the `webhook_url` or retrieved with the [Fetch](/api-endpoints/fetch.md) endpoint) looks like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "task_type": "wan-video",
    "video_url": "https://...........xxxx.mp4", // 
    "status": "finished",
    "percentage": 100
}
```

If the job is not completed, you will get a result like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "task_type": "wan-video",
    "status": "processing",
    "percentage": "40",
}
```

Credit cost:

| Model               | Resolution | Credits/sec |
| ------------------- | ---------- | ----------- |
| `wan2.5` / `wan2.6` | 1080P      | 11          |
| `wan2.5` / `wan2.6` | 720P       | 8           |
| `wan2.5`            | 480P       | 4           |
| `wan2.6-flash`      | 1080P      | 6           |
| `wan2.6-flash`      | 720P       | 4           |
