> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/seedance.md).

# Seedance

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/seedance-imagine`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="200">Name</th><th width="92">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>prompt</code></td><td>string</td><td>Text description for the video (3-2500 characters)</td></tr><tr><td><code>model</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>One of: <code>seedance-1.5-pro</code>, <code>seedance-2</code>, or <code>seedance-2-fast</code></td></tr><tr><td><code>image_url</code></td><td>string</td><td>Image URL for image-to-video (seedance-1.5-pro only)</td></tr><tr><td><code>first_frame_url</code></td><td>string</td><td>First frame image URL for I2V (seedance-2 / seedance-2-fast only)</td></tr><tr><td><code>last_frame_url</code></td><td>boolean</td><td>Last frame image URL for I2V (seedance-2 / seedance-2-fast only)</td></tr><tr><td><code>aspect_ratio</code></td><td>string</td><td><code>1:1</code>, <code>4:3</code>, <code>3:4</code>, <code>16:9</code> (default), <code>9:16</code>, <code>21:9</code>. Also <code>adaptive</code> for seedance-2/seedance-2-fast.</td></tr><tr><td><code>resolution</code></td><td>string</td><td><code>480p</code>, <code>720p</code> (default), or <code>1080p</code> (seedance-1.5-pro only)</td></tr><tr><td><code>duration</code></td><td>integer</td><td><code>4</code>, <code>8</code> (default), or <code>12</code> seconds</td></tr><tr><td><code>generate_audio</code></td><td>string</td><td>Generate audio for the video (default: false). Doubles the credit cost.</td></tr><tr><td><code>webhook_url</code></td><td>string</td><td>The final result and updates of this task will be posted at this URL.</td></tr><tr><td><code>webhook_secret</code></td><td>string</td><td>Will be passed as <code>x-webhook-secret</code> in the webhook call headers for authentication.</td></tr></tbody></table>

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
    "task_type": "seedance-video",
    "video_url": "https://...........xxxx.mp4", // 
    "status": "finished",
    "percentage": 100
}
```

If the job is not completed, you will get a result like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "task_type": "seedancee-video",
    "status": "processing",
    "percentage": "40",
}
```

Credit cost:

| Model            | 480p 4s | 480p 8s | 480p 12s | 720p 4s | 720p 8s | 720p 12s | 1080p 4s | 1080p 8s | 1080p 12s |
| ---------------- | ------- | ------- | -------- | ------- | ------- | -------- | -------- | -------- | --------- |
| seedance-1.5-pro | 4       | 8       | 12       | 8       | 16      | 24       | 16       | 32       | 48        |
| seedance-2       | 28      | 56      | 84       | 60      | 120     | 180      | —        | —        | —         |
| seedance-2-fast  | 24      | 48      | 72       | 52      | 104     | 156      | —        | —        | —         |

With `generate_audio: true`, all costs are doubled.
