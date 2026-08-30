> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/media-upload-apis/upload-image.md).

# Upload Image

<mark style="color:green;">`POST`</mark>` ``https://api.apiframe.pro/upload`

**Headers**

| Name                                            | Value                 |
| ----------------------------------------------- | --------------------- |
| Content-Type                                    | `multipart/form-data` |
| Authorization<mark style="color:red;">\*</mark> | Your APIFRAME API Key |

**Body**

<table><thead><tr><th width="200">Name</th><th width="107">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>image</code><mark style="color:red;"><code>*</code></mark></td><td>binary</td><td>The image file you want to upload. Maximum 2MB!</td></tr></tbody></table>

**Response**

{% tabs %}
{% tab title="200" %}

```json
// Success, the task has been submitted
{
  "imageURL": "https://cdn.apiframe.pro/images/xxxxxxxxxxxxxxxxxxx.png"
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
const FormData = require('form-data');
const fs = require('fs');
let data = new FormData();
data.append('image', fs.createReadStream('..../image.png'));

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.apiframe.pro/upload',
  headers: { 
    'Authorization': 'YOUR_API_KEY', 
    ...data.getHeaders()
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

url = "https://api.apiframe.pro/upload"

payload = {}
files=[
  ('image',('Vector.png',open('..../image.png','rb'),'image/png'))
]
headers = {
  'Authorization': 'YOUR_API_KEY'
}

response = requests.request("POST", url, headers=headers, data=payload, files=files)

print(response.text)

```

{% endtab %}

{% tab title="PHP" %}

```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.apiframe.pro/upload',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => array('image'=> new CURLFILE('..../image.png')),
  CURLOPT_HTTPHEADER => array(
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
MediaType mediaType = MediaType.parse("text/plain");
RequestBody body = new MultipartBody.Builder().setType(MultipartBody.FORM)
  .addFormDataPart("image","",
    RequestBody.create(MediaType.parse("application/octet-stream"),
    new File("..../image.png")))
  .build();
Request request = new Request.Builder()
  .url("https://api.apiframe.pro/upload")
  .method("POST", body)
  .addHeader("Authorization", "YOUR_API_KEY")
  .build();
Response response = client.newCall(request).execute();
```

{% endtab %}

{% tab title="Flutter" %}

```dart
var headers = {
  'Authorization': 'YOUR_API_KEY'
};
var data = FormData.fromMap({
  'files': [
    await MultipartFile.fromFile('..../image.png', filename: '')
  ],

});

var dio = Dio();
var response = await dio.request(
  'https://api.apiframe.pro/upload',
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
var request = new HttpRequestMessage(HttpMethod.Post, "https://api.apiframe.pro/upload");
request.Headers.Add("Authorization", "YOUR_API_KEY");
var content = new MultipartFormDataContent();
content.Add(new StreamContent(File.OpenRead("..../image.png")), "image", "zlpGHQ2ic/Vector.png");
request.Content = content;
var response = await client.SendAsync(request);
response.EnsureSuccessStatusCode();
Console.WriteLine(await response.Content.ReadAsStringAsync());

```

{% endtab %}

{% tab title="Ruby" %}

```ruby
require "uri"
require "net/http"

url = URI("https://api.apiframe.pro/upload")

https = Net::HTTP.new(url.host, url.port)
https.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = "YOUR_API_KEY"
form_data = [['image', File.open('.../image.png')]]
request.set_form form_data, 'multipart/form-data'
response = https.request(request)
puts response.read_body

```

{% endtab %}
{% endtabs %}
