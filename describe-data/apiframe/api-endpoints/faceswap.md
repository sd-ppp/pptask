> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/api-endpoints/faceswap.md).

# Faceswap

<mark style="color:green;">`POST`</mark>` ``https://api.apiframe.pro/faceswap`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="230">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>target_image_url</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>The URL of the image where the face will be swapped</td></tr><tr><td><code>swap_image_url</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>The url of the image where the new face should be taken from.</td></tr><tr><td><code>webhook_url</code></td><td>string</td><td>The final result of this task will be posted at this URL.</td></tr><tr><td><code>webhook_secret</code></td><td>string</td><td>Will be passed as <code>x-webhook-secret</code> in the webhook call headers for authentication.</td></tr></tbody></table>

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
    "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "image_url": "https://............./xxxxx.png",
    "task_type": "faceswap"
}
```

If the job is not completed, you will get a result like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "task_type": "faceswap",
    "status": "processing",
    "percentage": "80"
}
```

Code samples

{% tabs %}
{% tab title="JavaScript" %}

```javascript
const axios = require('axios');
let data = JSON.stringify({
  "target_image_url": "https://xxxxxxxxxxxxxxxxx/target.png",
  "swap_image_url": "https://xxxxxxxxxxxxxxxxx/swap.png"
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.apiframe.pro/faceswap',
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

url = "https://api.apiframe.pro/faceswap"

payload = json.dumps({
  "target_image_url": "https://xxxxxxxxxxxxxxxxx/target.png",
  "swap_image_url": "https://xxxxxxxxxxxxxxxxx/swap.png"
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
  CURLOPT_URL => 'https://api.apiframe.pro/faceswap',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "target_image_url": "https://xxxxxxxxxxxxxxxxx/target.png",
    "swap_image_url": "https://xxxxxxxxxxxxxxxxx/swap.png"
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
RequestBody body = RequestBody.create(mediaType, "{\r\n    \"target_image_url\": \"https://xxxxxxxxxxxxxxxxx/target.png\",\r\n    \"swap_image_url\": \"https://xxxxxxxxxxxxxxxxx/swap.png\"\r\n}");
Request request = new Request.Builder()
  .url("https://api.apiframe.pro/faceswap")
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
  "target_image_url": "https://xxxxxxxxxxxxxxxxx/target.png",
  "swap_image_url": "https://xxxxxxxxxxxxxxxxx/swap.png"
});
var dio = Dio();
var response = await dio.request(
  'https://api.apiframe.pro/faceswap',
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
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apiframe.pro/faceswap");
request.Headers.Add("Authorization", "YOUR_API_KEY");
var content = new StringContent("{\r\n    \"target_image_url\": \"https://xxxxxxxxxxxxxxxxx/target.png\",\r\n    \"swap_image_url\": \"https://xxxxxxxxxxxxxxxxx/swap.png\"\r\n}", null, "application/json");
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

url = URI("https://api.apiframe.pro/faceswap")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = "application/json"
request["Authorization"] = "YOUR_API_KEY"
request.body = JSON.dump({
  "target_image_url": "https://xxxxxxxxxxxxxxxxx/target.png",
  "swap_image_url": "https://xxxxxxxxxxxxxxxxx/swap.png"
})

response = https.request(request)
puts response.read_body

```

{% endtab %}
{% endtabs %}
