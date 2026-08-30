> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/ideogram/upscale.md).

# Upscale

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/ideogram-upscale`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="206">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>image_url</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>the url of the image to remix</td></tr><tr><td><code>prompt</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>the text prompt to describe the image to generate</td></tr><tr><td><code>resemblance</code><mark style="color:red;"><code>*</code></mark></td><td>integer</td><td>an integer between 1 and 100</td></tr><tr><td><code>detail</code></td><td>integer</td><td>an integer between 1 and 100</td></tr><tr><td><code>seed</code></td><td>integer</td><td>The seed for the generation</td></tr><tr><td><code>magic_prompt_option</code></td><td>string</td><td>It can be 'AUTO', 'ON', or 'OFF'<br>'AUTO' by default.</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
// Success, the image has been generated
{
    "task_id": "64cd7965-1b78-42c8-b929-9d7751a2e149",
    "image_urls": [
      "https://cdn.apiframe.pro/images/xxxxxxxxxxxxxx.png"
    ],
    "status": "finished",
    "task_type": "ideogram-upscale",
    "seed": 12345
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

Code samples

{% tabs %}
{% tab title="JavaScript" %}

```javascript
const axios = require('axios');
const data = JSON.stringify({
  "prompt": "a sunflower field in the wind",
  "image_url": "https://.....................x.png",
  "resemblance": 50,
});

const config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.apiframe.pro/ideogram-upscale',
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

url = "https://api.apiframe.pro/ideogram-upscale"

payload = json.dumps({
  "prompt": "a sunflower field in the wind",
  "image_url": "https://.....................x.png",
  "resemblance": 50,
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
  CURLOPT_URL => 'https://api.apiframe.pro/ideogram-upscale',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "prompt": "a sunflower field in the wind",
    "image_url": "https://.....................x.png",
    "resemblance": 50,
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
RequestBody body = RequestBody.create(mediaType, "{\r\n    \"prompt\": \"a sunflower field in the wind\",\r\n    \"resemblance\": 50,\r\n    \"image_url\": \"https://........x.png\",\r\n }");
Request request = new Request.Builder()
  .url("https://api.apiframe.pro/ideogram-upscale")
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
  "prompt": "a sunflower field in the wind",
  "image_url": "https://.....................x.png",
  "resemblance": 50,
});
var dio = Dio();
var response = await dio.request(
  'https://api.apiframe.pro/ideogram-upscale',
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
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apiframe.pro/ideogram-upscale");
request.Headers.Add("Authorization", "YOUR_API_KEY");
var content = new StringContent("{\r\n    \"prompt\": \"a sunflower field in the wind\",\r\n    \"resemblance\": 50,\r\n    \"image_url\": \"https://.........x.png\",\r\n}", null, "application/json");
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

url = URI("https://api.apiframe.pro/ideogram-upscale")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = "application/json"
request["Authorization"] = "YOUR_API_KEY"
request.body = JSON.dump({
  "prompt": "a sunflower field in the wind",
  "image_url": "https://.....................x.png",
  "resemblance": 50,
})

response = https.request(request)
puts response.read_body

```

{% endtab %}
{% endtabs %}
