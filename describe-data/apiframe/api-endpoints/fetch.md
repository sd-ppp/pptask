> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/api-endpoints/fetch.md).

# Fetch

<mark style="color:green;">`POST`</mark>` ``https://api.apiframe.pro/fetch`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `application/json`    |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="219">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>task_id</code><mark style="color:red;"><code>*</code></mark></td><td>string</td><td>The task_id of the task</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
{
  // The data depends on the type of the original request
  // You can see the different results on each endpoint page
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
let data = JSON.stringify({
  "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a"
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.apiframe.pro/fetch',
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

url = "https://api.apiframe.pro/fetch"

payload = json.dumps({
  "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a"
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
  CURLOPT_URL => 'https://api.apiframe.pro/fetch',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a"
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
RequestBody body = RequestBody.create(mediaType, "{\r\n    \"task_id\": \"29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a\"\r\n}");
Request request = new Request.Builder()
  .url("https://api.apiframe.pro/fetch")
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
  "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a"
});
var dio = Dio();
var response = await dio.request(
  'https://api.apiframe.pro/fetch',
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
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apiframe.pro/fetch");
request.Headers.Add("Authorization", "YOUR_API_KEY");
var content = new StringContent("{\r\n    \"task_id\": \"29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a\"\r\n}", null, "application/json");
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

url = URI("https://api.apiframe.pro/fetch")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = "application/json"
request["Authorization"] = "YOUR_API_KEY"
request.body = JSON.dump({
  "task_id": "29e983ca-7e86-4017-a9e3-ef6fe9cd5f2a"
})

response = https.request(request)
puts response.read_body

```

{% endtab %}
{% endtabs %}
