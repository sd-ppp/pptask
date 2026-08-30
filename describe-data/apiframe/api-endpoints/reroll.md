> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/api-endpoints/reroll.md).

# Reroll

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/reroll`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="212">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>parent_task_id</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>The task ID of the original task</td></tr><tr><td><code>prompt</code></td><td>string</td><td>Prompt for re-drawing default value: original prompt from parent task</td></tr><tr><td><code>webhook_url</code></td><td>string</td><td>The final result and updates of this task will be posted at this URL.</td></tr><tr><td><code>webhook_secret</code></td><td>string</td><td>Will be passed as <code>x-webhook-secret</code> in the webhook call headers for authentication.</td></tr></tbody></table>

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

This endpoint doesn't generate images instantly, you can use the [Fetch](/api-endpoints/fetch.md) endpoint to fetch the result or use [webhooks](/webhooks.md).

The result (posted to the `webhook_url` or retrieved with the [Fetch](/api-endpoints/fetch.md) endpoint) looks like this:

```json
{
    "taskId": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "task_type": "reroll",
    "original_image_url": "https://.../xxxxxxxx.png", // grid image
    "image_urls": [
        "https://.../xxxx1.png",
        "https://.../xxxx2.png",
        "https://.../xxxx3.png",
        "https://.../xxxx4.png"
    ]
}
```

If the job is not completed, you will get a result like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "task_type": "reroll",
    "status": "processing",
    "percentage": "80",
}
```

Code samples

{% tabs %}
{% tab title="JavaScript" %}

<pre class="language-javascript"><code class="lang-javascript">const axios = require('axios');
const data = JSON.stringify({
<strong>  "parent_task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
</strong>  "prompt": "a sunflower field in the wind",
  "aspect_ratio": "3:2",
  "webhook_url": "https://........",
  "webhook_secret": "abc123"
});

const config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.apiframe.pro/reroll',
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

</code></pre>

{% endtab %}

{% tab title="Python" %}

```python
import requests
import json

url = "https://api.apiframe.pro/reroll"

payload = json.dumps({
  "parent_task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
  "prompt": "a sunflower field in the wind",
  "aspect_ratio": "3:2",
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
  CURLOPT_URL => 'https://api.apiframe.pro/reroll',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "parent_task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "prompt": "a sunflower field in the wind",
    "aspect_ratio": "3:2",
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
RequestBody body = RequestBody.create(mediaType, "{\r\n    \"parent_task_id\": \"29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a\",\r\n    \"prompt\": \"a sunflower field in the wind\",\r\n    \"aspect_ratio\": \"3:2\",\r\n    \"webhook_url\": \"https://........\",\r\n    \"webhook_secret\": \"abc123\"\r\n}");
Request request = new Request.Builder()
  .url("https://api.apiframe.pro/reroll")
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
  "parent_task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
  "prompt": "a sunflower field in the wind",
  "aspect_ratio": "3:2",
  "webhook_url": "https://........",
  "webhook_secret": "abc123"
});
var dio = Dio();
var response = await dio.request(
  'https://api.apiframe.pro/reroll',
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
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apiframe.pro/reroll");
request.Headers.Add("Authorization", "YOUR_API_KEY");
var content = new StringContent("{\r\n    \"parent_task_id\": \"29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a\",\r\n    \"prompt\": \"a sunflower field in the wind\",\r\n    \"aspect_ratio\": \"3:2\",\r\n   \"webhook_url\": \"https://........\",\r\n    \"webhook_secret\": \"abc123\"\r\n}", null, "application/json");
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

url = URI("https://api.apiframe.pro/reroll")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = "application/json"
request["Authorization"] = "YOUR_API_KEY"
request.body = JSON.dump({
  "parent_task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
  "prompt": "a sunflower field in the wind",
  "aspect_ratio": "3:2",
  "webhook_url": "https://........",
  "webhook_secret": "abc123"
})

response = https.request(request)
puts response.read_body

```

{% endtab %}
{% endtabs %}

dd
