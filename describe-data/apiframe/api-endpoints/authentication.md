> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/api-endpoints/authentication.md).

# Authentication

To authenticate your API calls set the Authorization header to your API Key.

You can find your API Key on the [Dashboard](https://app.apiframe.pro/account).

<mark style="color:green;">`POST`</mark> `https://api.apiframe.pro/[any_endpoint]`

**Headers**

| Name                                            | Value              |
| ----------------------------------------------- | ------------------ |
| Content-Type                                    | `application/json` |
| Authorization<mark style="color:red;">\*</mark> | `YOUR_API_KEY`     |
