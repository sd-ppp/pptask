> For the complete documentation index, see [llms.txt](https://docs.apiframe.ai/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.apiframe.ai/api-endpoints.md).

# MIDJOURNEY

- [Read this](https://docs.apiframe.ai/api-endpoints/read-this.md)
- [Authentication](https://docs.apiframe.ai/api-endpoints/authentication.md)
- [Imagine](https://docs.apiframe.ai/api-endpoints/imagine.md): Generate an image using a text prompt. This is the /imagine command on Discord.
- [Imagine Video](https://docs.apiframe.ai/api-endpoints/imagine-video.md): Generate videos using a text prompt and an image URL.
- [Extend Video](https://docs.apiframe.ai/api-endpoints/extend-video.md): Extend previously generated videos.
- [Reroll](https://docs.apiframe.ai/api-endpoints/reroll.md): Reroll to create new images from a previous Imagine task.
- [Upscales](https://docs.apiframe.ai/api-endpoints/upscales.md): Enhance previously generated images by upscaling them.
- [Upscale 1x](https://docs.apiframe.ai/api-endpoints/upscales/upscale-1x.md): Upscale one of the 4 generated images by the Imagine endpoint to get a single image.
- [Upscale: Creative and Subtle](https://docs.apiframe.ai/api-endpoints/upscales/upscale-creative-and-subtle.md): The Upscale (Subtle) option doubles the size of your image and keeps details very similar to the original adds Upscale (Creative) adds details to the image. Of course you first need to Upscale 1x.
- [Upscale: 2x and 4x](https://docs.apiframe.ai/api-endpoints/upscales/upscale-2x-and-4x.md): Upscale any image to higher resolution, this is not from Midjourney. Image must not be larger than 2048x2048.
- [Variations](https://docs.apiframe.ai/api-endpoints/variations.md): Create 4 new variations of one of the 4 generated images by the Imagine request.
- [Faceswap](https://docs.apiframe.ai/api-endpoints/faceswap.md): Swap the face on a target image with the face on a provided image. Each image must contain only one face.
- [Inpaint (Vary Region)](https://docs.apiframe.ai/api-endpoints/inpaint-vary-region.md): Redraw a selected area of an image. Of course you first need to Upscale 1x.
- [Outpaint (Zoom Out)](https://docs.apiframe.ai/api-endpoints/outpaint-zoom-out.md): The outpaint endpoint enlarges an image's canvas beyond its original size while keeping the contents of the original image unchanged. Of course you first need to Upscale 1x.
- [Pan](https://docs.apiframe.ai/api-endpoints/pan.md): Broadens the image canvas in a specific direction, keeping the original content intact and using prompts and the original image as guides for filling the expanded area. You first need to Upscale 1x
- [Shorten](https://docs.apiframe.ai/api-endpoints/shorten.md): This analyzes your prompt, highlights some of your prompt's most influential words, and suggests unnecessary words you could remove. You can then optimize your prompt by focusing on essential terms.
- [Describe](https://docs.apiframe.ai/api-endpoints/describe.md): Writes four example prompts based on an image you upload. This is the same as using the /describe command in Discord.
- [Blend](https://docs.apiframe.ai/api-endpoints/blend.md): Blend multiple images into one image.
- [Seed](https://docs.apiframe.ai/api-endpoints/seed.md): Get the seed of a generated image.
- [Fetch](https://docs.apiframe.ai/api-endpoints/fetch.md): Get the result/status of a submitted task.
- [Fetch Many](https://docs.apiframe.ai/api-endpoints/fetch-many.md): Get the results/statuses of multiple tasks using their task\_id.
- [Account Info](https://docs.apiframe.ai/api-endpoints/account-info.md): Get details about your account: credits remaining, stats, etc..
- [Statuses](https://docs.apiframe.ai/api-endpoints/statuses.md): Here are the different possible statuses for a task
- [Postman Collection](https://docs.apiframe.ai/api-endpoints/postman-collection.md)
