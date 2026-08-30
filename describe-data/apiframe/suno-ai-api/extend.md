> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/suno-ai-api/extend.md).

# EXTEND

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/suno-extend`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="237">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>parent_task_id</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>the id of the original suno task</td></tr><tr><td><code>song_id</code></td><td>string</td><td>the song_id of one of the two generated songs to extend. Not needed when you are extending an uploaded audio.</td></tr><tr><td><code>continue_at</code></td><td>float</td><td>The timestamp from where the song should be extended</td></tr><tr><td><code>prompt</code></td><td>string</td><td>the text prompt for Suno AI, just describe the song. </td></tr><tr><td><code>model</code></td><td>string</td><td>The music generation model to use. Accepted values: <code>V4</code>, <code>V4_5</code>, <code>V4_5PLUS</code>, <code>V4_5ALL</code>, <code>V5</code>. Legacy aliases are also supported:  <code>chirp-v4</code> (maps to <code>V4</code>), <code>chirp-auk</code> (maps to <code>V4_5</code>), <code>chirp-bluejay</code> (maps to <code>V4_5PLUS</code>), <code>chirp-crow</code> (maps to <code>V5</code>).</td></tr><tr><td><code>lyrics</code></td><td>string</td><td>lyrics for the song to generate</td></tr><tr><td><code>title</code></td><td>string</td><td>a title for the song</td></tr><tr><td><code>tags</code></td><td>string</td><td>style tags for the song, ex: 'rap pop'</td></tr><tr><td><code>webhook_url</code></td><td>string</td><td>The final results of this task and updates will be posted at this URL.</td></tr><tr><td><code>webhook_secret</code></td><td>string</td><td>Will be passed as <code>x-webhook-secret</code> in the webhook call headers for authentication.</td></tr></tbody></table>

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

This endpoint doesn't generate the songs instantly; you can use the [Fetch](/api-endpoints/fetch.md) endpoint to fetch the result or use [webhooks](/webhooks.md).

The result (posted to the `webhook_url` or retrieved with the [Fetch](/api-endpoints/fetch.md) endpoint) looks like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-xxxxxxxxx",
    "task_type": "suno",
    "status": "finished",
    "video_url": "https://...........xxxx.mp4",
    "songs": [
      {
        "lyrics": "....",
        "song_id": "ea6813ad-03ce-4a0b-a616-xxxxxxxxx",
        "audio_url": "https://....xxxxxxxxx.mp3",
        "image_url": "https://....xxxxxxxxx.jpeg",
        "video_url": "https://....xxxxxxxxx.mp4"
      },
      {
        "lyrics": "...",
        "song_id": "21ad7efc-4954-4ae4-ae2a-xxxxxxxx",
        "audio_url": "https://....xxxxxxxxx.mp3",
        "image_url": "https://....xxxxxxxxx.jpeg",
        "video_url": "https://....xxxxxxxxx.mp4"
      }
  ]
}
```

If the job is not completed, you will get a result like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-xxxxxxxxx",
    "task_type": "suno",
    "status": "processing",
    "percentage": 56,
    "video_url": "https://...........xxxx.mp4",
    "songs": [
      {
        "lyrics": "....",
        "song_id": "ea6813ad-03ce-4a0b-a616-xxxxxxxxx",
        "audio_url": "https://....xxxxxxxxx.mp3",
        "image_url": "https://....xxxxxxxxx.jpeg",
        "video_url": "https://....xxxxxxxxx.mp4"
      },
      {
        "lyrics": "...",
        "song_id": "21ad7efc-4954-4ae4-ae2a-xxxxxxxx",
        "audio_url": "https://....xxxxxxxxx.mp3",
        "image_url": "https://....xxxxxxxxx.jpeg",
        "video_url": "https://....xxxxxxxxx.mp4"
      }
  ]
}
```

Code samples

{% tabs %}
{% tab title="JavaScript" %}

```javascript
const axios = require('axios');
const data = JSON.stringify({
  "parent_task_id": "xxxxxxxxx",
  "song_id": "xxxxxxxxxx",
  "webhook_url": "https://........",
  "webhook_secret": "abc123"
});

const config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.apiframe.pro/suno-extend',
  headers: { 
    'Content-Type': 'application/json', 
    'Authorization': 'YOUR_API_KEY'
  },
  data : data
};

axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});

```

{% endtab %}

{% tab title="Python" %}

```python
import requests
import json

url = "https://api.apiframe.pro/suno-extend"

payload = json.dumps({
  "parent_task_id": "xxxxxxxxx",
  "song_id": "xxxxxxxxxx",
  "webhook_url": "https://........",
  "webhook_secret": "abc123"
})
headers = {
  'Content-Type': 'application/json',
  'Authorization': 'YOUR_API_KEY'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)

```

{% endtab %}

{% tab title="PHP" %}

```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.apiframe.pro/suno-extend',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "parent_task_id": "xxxxxxxxx",
    "song_id": "xxxxxxxxxx",
    "webhook_url": "https://........",
    "webhook_secret": "abc123"
}',
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'Authorization: YOUR_API_KEY'
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;

```

{% endtab %}

{% tab title="Java" %}

```java
OkHttpClient client = new OkHttpClient().newBuilder()
  .build();
MediaType mediaType = MediaType.parse("application/json");
RequestBody body = RequestBody.create(mediaType, "{\r\n    \"parent_task_id\": \"xxxxxxxxxxx\",\r\n    \"song_id\": \"xxxxxxxxxxx\",\r\n    \"webhook_url\": \"https://........\",\r\n    \"webhook_secret\": \"abc123\"\r\n}");
Request request = new Request.Builder()
  .url("https://api.apiframe.pro/suno-extend")
  .method("POST", body)
  .addHeader("Content-Type", "application/json")
  .addHeader("Authorization", "YOUR_API_KEY")
  .build();
Response response = client.newCall(request).execute();
```

{% endtab %}

{% tab title="Flutter" %}

```dart
var headers = {
  'Content-Type': 'application/json',
  'Authorization': 'YOUR_API_KEY'
};
var data = json.encode({
  "parent_task_id": "xxxxxxxxx",
  "song_id": "xxxxxxxxxx",
  "webhook_url": "https://........",
  "webhook_secret": "abc123"
});
var dio = Dio();
var response = await dio.request(
  'https://api.apiframe.pro/luma-extend',
  options: Options(
    method: 'POST',
    headers: headers,
  ),
  data: data,
);

if (response.statusCode == 200) {
  print(json.encode(response.data));
}
else {
  print(response.statusMessage);
}
```

{% endtab %}

{% tab title="C#" %}

```csharp
var client = new HttpClient();
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apiframe.pro/suno-extend");
request.Headers.Add("Authorization", "YOUR_API_KEY");
var content = new StringContent("{\r\n    \"parent_task_id\": \"xxxxxxxxxxx\",\r\n    \"song_id\": \"xxxxxxxxxxx\",\r\n    \"webhook_url\": \"https://........\",\r\n    \"webhook_secret\": \"abc123\"\r\n}", null, "application/json");
request.Content = content;
var response = await client.SendAsync(request);
response.EnsureSuccessStatusCode();
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

{% endtab %}

{% tab title="Ruby" %}

```ruby
require "uri"
require "json"
require "net/http"

url = URI("https://api.apiframe.pro/suno-extend")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = "application/json"
request["Authorization"] = "YOUR_API_KEY"
request.body = JSON.dump({
  "parent_task_id": "xxxxxxxxx",
  "song_id": "xxxxxxxxxx",
  "webhook_url": "https://........",
  "webhook_secret": "abc123"
})

response = https.request(request)
puts response.read_body

```

{% endtab %}
{% endtabs %}
