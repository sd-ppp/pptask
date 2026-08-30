> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/nano-banana/nano-banana.md).

# Nano Banana

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/nano-banana`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="206">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>prompt</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>The text prompt for generating or editing images</td></tr><tr><td><code>images</code><mark style="color:red;"><code>*</code></mark></td><td>[string]</td><td>Array of image URLs or Base64 of the images to edit</td></tr><tr><td><code>aspect_ratio</code></td><td>string</td><td>aspect_ratio should be one of: match_input_image, 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9! By default, it is match_input_image</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
// Success, the task has been submitted
{
  "task_id": "34f439ce-b545-4c57-a5bd-a3xxxxxxxx",
  "image_urls": [
    "https://cdn.apiframe.pro/images/xxxxxxxxxxxxxxxxxxxx.png"
  ],
  "status": "finished",
  "task_type": "nano-banana"
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
