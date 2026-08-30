> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/ai-photos/generate.md).

# Generate

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/ai-photo-generate`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="206">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>training_id</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>the task_id of the corresponding training task</td></tr><tr><td><code>prompt</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>the text prompt to describe the photo to generate<br><br>Ex: a realistic portrait of TOKMSN black man wearing a suit</td></tr><tr><td><code>aspect_ratio</code></td><td>string</td><td><p>Aspect ratio for the image, one of '1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9', '9:21', '5:4', '4:5', '1:2', '2:1', '1:3', '3:1', '1:4', '4:1', or 'custom'</p><p>Default: 1:1<br><br>Needs to be 'custom' if you provide height and width</p></td></tr><tr><td><code>width</code></td><td>string</td><td>The width of the images<br><br>The aspect_ratio needs to be custom for this</td></tr><tr><td><code>height</code></td><td>string</td><td>The height of the images<br><br>The aspect_ratio needs to be custom for this</td></tr><tr><td><code>number_of_images</code></td><td>string</td><td>Number of images to generate: 1 to 4</td></tr><tr><td><code>seed</code></td><td>integer</td><td>The seed for the generation</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
// Success, the image has been generated
{
  "task_id": "82ddc894-7c88-48d8-8f65-63101c3c88fc",
  "status": "finished",
  "task_type": "ai-photo-generate",
  "image_urls": [
    "https://cdn.apiframe.pro/images/xxxxxxxxxxxxx-0.png",
    "https://cdn.apiframe.pro/images/xxxxxxxxxxxxx-1.png"
  ]
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
  "training_id": "...",
  "prompt": "a portrait of TOKMSN Asian female..",
});

const config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.apiframe.pro/ai-photo-generate',
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

url = "https://api.apiframe.pro/ai-photo-generate"

payload = json.dumps({
  "training_id": "...",
  "prompt": "a portrait of TOKMSN Asian female..",
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
  CURLOPT_URL => 'https://api.apiframe.pro/ai-photo-generate',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "training_id": "...",
    "prompt": "a portrait of TOKMSN Asian female..",
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
RequestBody body = RequestBody.create(mediaType, "{\r\n  \"training_id\": \"...\",  \"prompt\": \"a portrait of TOKMSN Asian female..\",\r\n   }");
Request request = new Request.Builder()
  .url("https://api.apiframe.pro/ai-photo-generate")
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
  "training_id": "...",
  "prompt": "a portrait of TOKMSN Asian female..",
});
var dio = Dio();
var response = await dio.request(
  'https://api.apiframe.pro/ai-photo-generate',
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
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apiframe.pro/ai-photo-generate");
request.Headers.Add("Authorization", "YOUR_API_KEY");
var content = new StringContent("{\r\n    \"training_id\": \"...\", \"prompt\": \"a portrait of TOKMSN Asian female..\", \r\n}", null, "application/json");
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

url = URI("https://api.apiframe.pro/ai-photo-generate")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = "application/json"
request["Authorization"] = "YOUR_API_KEY"
request.body = JSON.dump({
  "training_id": "...",
  "prompt": "a portrait of TOKMSN Asian female..",
})

response = https.request(request)
puts response.read_body

```

{% endtab %}
{% endtabs %}
