> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/flux/imagine.md).

# Imagine

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/flux-imagine`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="206">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>model</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>The model to use for the generation; It can be 'flux-schnell', 'flux-pro', 'flux-dev', 'flux-pro-1.1', or 'flux-pro-1.1-ultra'</td></tr><tr><td><code>prompt</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>the text prompt to describe the image to generate</td></tr><tr><td><code>image_prompt</code></td><td>string</td><td>Optional base64 encoded image to use for image-to-image</td></tr><tr><td><code>image_prompt_strength</code></td><td>float</td><td>Should be a float between 0 and 1<br>Only for 'flux-pro-1.1-ultra'</td></tr><tr><td><code>prompt_upsampling</code></td><td>boolean</td><td>Whether to perform upsampling on the prompt. If active, automatically modifies the prompt for more creative generation.</td></tr><tr><td><code>width</code></td><td>integer</td><td>The width of the image to generate, min 256 and max 1440. Default: 1024</td></tr><tr><td><code>height</code></td><td>integer</td><td>The height of the image to generate, min 256 and max 1440. Default: 768</td></tr><tr><td><code>aspect_ratio</code></td><td>string</td><td>Aspect ratio of the image between 21:9 and 9:21<br>Default: 16:9<br>Only for flux-pro-1.1-ultra'</td></tr><tr><td><code>steps</code></td><td>integer</td><td>Number of steps for the image generation process. Only for 'flux-pro' and 'flux-dev'</td></tr><tr><td><code>guidance</code></td><td>float</td><td>Guidance scale for image generation. High guidance scales improve prompt adherence at the cost of reduced realism.<br>Only for 'flux-pro' and 'flux-dev'</td></tr><tr><td><code>interval</code></td><td>integer</td><td>Interval parameter for guidance control. Default: 2<br>Min: 1, Max: 4<br>Only for 'flux-pro'</td></tr><tr><td><code>seed</code></td><td>integer</td><td>The seed to use for the generation</td></tr><tr><td><code>safety_tolerance</code></td><td>integer</td><td>Tolerance level for input and output moderation. Between 0 and 6, 0 being most strict, 6 being least strict.</td></tr><tr><td><code>raw</code></td><td>boolean</td><td>Generate less processed, more natural-looking images<br>Only for flux-pro-1.1-ultra'</td></tr><tr><td><code>webhook_url</code></td><td>string</td><td>The final result and updates of this task will be posted at this URL.</td></tr><tr><td><code>webhook_secret</code></td><td>string</td><td>Will be passed as <code>x-webhook-secret</code> in the webhook call headers for authentication.</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
// Success, the task has been submitted
{
    "task_id": "64cd7965-1b78-42c8-b929-9d7751a2e149"
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
    "task_type": "flux-imagine",
    "original_image_url": "https://.../xxxxxxxx.png", // grid image
    "image_url": "https://.../xxxxxxxx.png"
}
```

If the job is not completed, you will get a result like this:

```json
{
    "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a",
    "task_type": "flux-imagine",
    "status": "processing",
    "percentage": 40
}
```

Code samples

{% tabs %}
{% tab title="JavaScript" %}

```javascript
const axios = require('axios');
const data = JSON.stringify({
  "prompt": "a sunflower field in the wind",
  "model": "flux-pro"
});

const config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.apiframe.pro/flux-imagine',
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

url = "https://api.apiframe.pro/flux-imagine"

payload = json.dumps({
  "prompt": "a sunflower field in the wind",
  "model": "flux-pro"
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
  CURLOPT_URL => 'https://api.apiframe.pro/flux-imagine',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "prompt": "a sunflower field in the wind",
    "model": "flux-pro"
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
RequestBody body = RequestBody.create(mediaType, "{\r\n    \"prompt\": \"a sunflower field in the wind\",\r\n  \"model\": \"flux-pro\",\r\n   }");
Request request = new Request.Builder()
  .url("https://api.apiframe.pro/flux-imagine")
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
  "model": "flux-pro"
});
var dio = Dio();
var response = await dio.request(
  'https://api.apiframe.pro/flux-imagine',
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
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apiframe.pro/flux-imagine");
request.Headers.Add("Authorization", "YOUR_API_KEY");
var content = new StringContent("{\r\n    \"prompt\": \"a sunflower field in the wind\"    \"model\": \"flux-pro\" \r\n}", null, "application/json");
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

url = URI("https://api.apiframe.pro/flux-imagine")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = "application/json"
request["Authorization"] = "YOUR_API_KEY"
request.body = JSON.dump({
  "prompt": "a sunflower field in the wind",
  "model": "flux-pro"
})

response = https.request(request)
puts response.read_body

```

{% endtab %}
{% endtabs %}
