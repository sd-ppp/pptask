# GPT Image-1.5 - Image to Image

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/v1/jobs/createTask:
    post:
      summary: GPT Image-1.5 - Image to Image
      deprecated: false
      description: >
        ## Overview


        Generate images from input images using the GPT Image 1.5 Image To Image
        model. This model allows you to edit or modify existing images with text
        prompts. The process consists of two steps: create a generation task and
        query task status and results.


        ## File Upload Requirements


        Before using this API, you need to upload your image files:


        <Steps>

        <Step title="Upload Image">
          Use the File Upload API to upload your source image.

          <Card title="File Upload API" icon="lucide-upload" href="/file-upload-api/quickstart">
            Learn how to upload images and get file URLs
          </Card>
        </Step>


        <Step title="Get File URL">
          After upload, you'll receive a file URL that you can use in the `input_urls` parameter.
        </Step>

        </Steps>


        <Warning>

        - Supported formats: JPEG, PNG, WebP

        - Maximum file size: 10MB

        - Maximum 16 input URLs per request

        - Images should be appropriate and follow usage guidelines

        </Warning>


        ## Query Task Status


        After submitting a task, use the unified query endpoint to check
        progress and retrieve results:


        <Card title="Get Task Details" icon="lucide-search"
        href="/market/common/get-task-detail">
          Learn how to query task status and retrieve generation results
        </Card>


        ::: tip[]

        For production use, we recommend using the `callBackUrl` parameter to
        receive automatic notifications when generation completes, rather than
        polling the status endpoint.

        :::


        ## Related Resources


        <CardGroup cols={2}>
          <Card title="Market Overview" icon="lucide-store" href="/market/quickstart">
            Explore all available models
          </Card>
          <Card title="Common API" icon="lucide-cog" href="/common-api/get-account-credits">
            Check credits and account usage
          </Card>
        </CardGroup>
      operationId: gpt-image-1-5-image-to-image
      tags:
        - docs/en/Market/Image    Models/GPT Image
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - model
              properties:
                model:
                  type: string
                  enum:
                    - gpt-image/1.5-image-to-image
                  default: gpt-image/1.5-image-to-image
                  description: |-
                    The model name to use for generation. Required field.

                    - Must be `gpt-image/1.5-image-to-image` for this endpoint
                  examples:
                    - gpt-image/1.5-image-to-image
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    The URL to receive generation task completion updates.
                    Optional but recommended for production use.


                    - System will POST task status and results to this URL when
                    generation completes

                    - Callback includes generated content URLs and task
                    information

                    - Your callback endpoint should accept POST requests with
                    JSON payload containing results

                    - Alternatively, use the Get Task Details endpoint to poll
                    task status

                    - To ensure callback security, see [Webhook Verification
                    Guide](/common-api/webhook-verification) for signature
                    verification implementation
                  examples:
                    - https://your-domain.com/api/callback
                input:
                  type: object
                  description: Input parameters for the generation task
                  properties:
                    input_urls:
                      description: >-
                        Upload an image file to use as input for the API (File
                        URL after upload, not file content; Accepted types:
                        image/jpeg, image/png, image/webp; Max size: 10.0MB)
                      type: array
                      items:
                        type: string
                        format: uri
                      maxItems: 16
                      examples:
                        - - >-
                            https://static.aiquickdraw.com/tools/example/1765962794374_GhtqB9oX.webp
                    prompt:
                      description: A text description of the image you want to generate
                      type: string
                      examples:
                        - >-
                          Edit the image to dress the woman using the provided
                          clothing images. Preserve her exact likeness,
                          expression, hairstyle, and proportions. Replace only
                          the clothing, fitting the garments naturally to her
                          existing pose and body geometry with realistic fabric
                          behavior. Match lighting, shadows, and color
                          temperature to the original photo so the outfit
                          integrates photorealistically, without looking pasted
                          on.
                    aspect_ratio:
                      description: >-
                        Width-height ratio of the image, determining its visual
                        form.
                      type: string
                      enum:
                        - '1:1'
                        - '2:3'
                        - '3:2'
                      default: '3:2'
                      examples:
                        - '3:2'
                    quality:
                      description: 'Quality: medium=balanced, high=slow/detailed.'
                      type: string
                      enum:
                        - medium
                        - high
                      default: medium
                      examples:
                        - medium
                  required:
                    - input_urls
                    - prompt
                    - aspect_ratio
                    - quality
                  x-apidog-orders:
                    - input_urls
                    - prompt
                    - aspect_ratio
                    - quality
                  x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: gpt-image/1.5-image-to-image
              callBackUrl: https://your-domain.com/api/callback
              input:
                input_urls:
                  - >-
                    https://static.aiquickdraw.com/tools/example/1765962794374_GhtqB9oX.webp
                prompt: >-
                  Edit the image to dress the woman using the provided clothing
                  images. Preserve her exact likeness, expression, hairstyle,
                  and proportions. Replace only the clothing, fitting the
                  garments naturally to her existing pose and body geometry with
                  realistic fabric behavior. Match lighting, shadows, and color
                  temperature to the original photo so the outfit integrates
                  photorealistically, without looking pasted on.
                aspect_ratio: '3:2'
                quality: medium
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
              example:
                code: 200
                msg: success
                data:
                  taskId: task_gpt-image_1765968156336
          headers: {}
          x-apidog-name: ''
      security:
        - BearerAuth: []
          x-apidog:
            schemeGroups:
              - id: kn8M4YUlc5i0A0179ezwx
                schemeIds:
                  - BearerAuth
            required: true
            use:
              id: kn8M4YUlc5i0A0179ezwx
            scopes:
              kn8M4YUlc5i0A0179ezwx:
                BearerAuth: []
      x-apidog-folder: docs/en/Market/Image    Models/GPT Image
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-28506372-run
components:
  schemas:
    ApiResponse:
      type: object
      properties:
        code:
          type: integer
          description: >-
            Response status code


            - **200**: Success - Request has been processed successfully

            - **401**: Unauthorized - Authentication credentials are missing or
            invalid

            - **402**: Insufficient Credits - Account does not have enough
            credits to perform the operation

            - **404**: Not Found - The requested resource or endpoint does not
            exist

            - **422**: Validation Error - The request parameters failed
            validation checks

            - **429**: Rate Limited - Request limit has been exceeded for this
            resource

            - **433**: Request Limit - Sub-key Usage Exceeds Limit

            - **455**: Service Unavailable - System is currently undergoing
            maintenance

            - **500**: Server Error - An unexpected error occurred while
            processing the request

            - **501**: Generation Failed - Content generation task failed

            - **505**: Feature Disabled - The requested feature is currently
            disabled
          enum:
            - 200
            - 401
            - 402
            - 404
            - 422
            - 429
            - 433
            - 455
            - 500
            - 501
            - 505
          x-apidog-enum:
            - value: 200
              name: ''
              description: ''
            - value: 401
              name: ''
              description: ''
            - value: 402
              name: ''
              description: ''
            - value: 404
              name: ''
              description: ''
            - value: 422
              name: ''
              description: ''
            - value: 429
              name: ''
              description: ''
            - value: 433
              name: ''
              description: ''
            - value: 455
              name: ''
              description: ''
            - value: 500
              name: ''
              description: ''
            - value: 501
              name: ''
              description: ''
            - value: 505
              name: ''
              description: ''
        msg:
          type: string
          description: Response message, error description when failed
          examples:
            - success
        data:
          type: object
          properties:
            taskId:
              type: string
              description: >-
                Task ID, can be used with Get Task Details endpoint to query
                task status
          x-apidog-orders:
            - taskId
          required:
            - taskId
          x-apidog-ignore-properties: []
      x-apidog-orders:
        - code
        - msg
        - data
      title: response not with recordId
      required:
        - data
      x-apidog-ignore-properties: []
      x-apidog-folder: ''
  securitySchemes:
    BearerAuth:
      type: bearer
      scheme: bearer
      bearerFormat: API Key
      description: >-
        All API requests require a Bearer Token. Add the header `Authorization:
        Bearer YOUR_API_KEY` to authenticate requests.
    BearerAuth1:
      type: bearer
      scheme: bearer
      bearerFormat: API Key
      description: >-
        所有 API 请求都需要 Bearer Token。请在请求头中添加 `Authorization: Bearer YOUR_API_KEY`
        进行身份验证。
servers:
  - url: https://api.kie.ai
    description: 正式环境
security:
  - BearerAuth: []
    x-apidog:
      schemeGroups:
        - id: kn8M4YUlc5i0A0179ezwx
          schemeIds:
            - BearerAuth
      required: true
      use:
        id: kn8M4YUlc5i0A0179ezwx
      scopes:
        kn8M4YUlc5i0A0179ezwx:
          BearerAuth: []

```
