# Google - Nano Banana 2 Lite

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
      summary: Google - Nano Banana 2 Lite
      deprecated: false
      description: >-
        ## Create Task


        Use this endpoint to create a new image generation task. Provide a text
        prompt, and optionally include image URLs as visual references.


        - Set `image_urls` to an empty array or omit it for pure text-to-image
        generation. Up to 10 images are supported.

        - Supported aspect ratios: `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`,
        `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9`, `auto`.
        Default: `auto`.


        <Card title="Get Task Details" icon="lucide-search"
        href="/market/common/get-task-detail">
          After submission, use the unified query endpoint to check task progress and retrieve results
        </Card>


        ::: tip[]

        For production use, we recommend providing the `callBackUrl` parameter
        so your service can receive completion notifications instead of polling
        for task status.

        :::


        ## Related Resources


        <CardGroup cols={2}>
          <Card title="Model Marketplace" icon="lucide-store" href="/market/quickstart">
            Explore all available models and capabilities
          </Card>
          <Card title="Common API" icon="lucide-cog" href="/common-api/get-account-credits">
            Check account credits and usage
          </Card>
        </CardGroup>
      operationId: nano-banana-2-lite
      tags:
        - docs/en/Market/Image    Models/Google
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - model
                - input
              properties:
                model:
                  type: string
                  enum:
                    - nano-banana-2-lite
                  default: nano-banana-2-lite
                  description: >-
                    The model name used for generation. This field is required.
                    This endpoint must use the `nano-banana-2-lite` model.
                  examples:
                    - nano-banana-2-lite
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    Callback URL for task completion notifications. Optional
                    parameter. If provided, the system will send a POST request
                    to this URL when the task completes, whether it succeeds or
                    fails. If omitted, no callback notification will be sent.
                  examples:
                    - https://your-domain.com/api/callback
                input:
                  type: object
                  description: Input parameters for the image generation task.
                  required:
                    - prompt
                    - aspect_ratio
                  properties:
                    image_urls:
                      type: array
                      maxItems: 10
                      items:
                        type: string
                        format: uri
                      default: []
                      description: >-
                        Input image URL array. Optional parameter. Set to an
                        empty array or omit it for pure text-to-image
                        generation. Supports up to 10 images.


                        - Please provide uploaded file URLs, not raw file
                        content

                        - Accepted types: `image/jpeg`, `image/png`,
                        `image/webp`

                        - Max size: 30.0MB
                      examples:
                        - - >-
                            https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png
                    prompt:
                      type: string
                      maxLength: 20000
                      description: >-
                        Text prompt used to generate the image. Required.
                        Maximum length: 20000 characters.
                      examples:
                        - Generate a pig on the grass, cinematic light
                    aspect_ratio:
                      type: string
                      enum:
                        - '1:1'
                        - '1:4'
                        - '1:8'
                        - '2:3'
                        - '3:2'
                        - '3:4'
                        - '4:1'
                        - '4:3'
                        - '4:5'
                        - '5:4'
                        - '8:1'
                        - '9:16'
                        - '16:9'
                        - '21:9'
                        - auto
                      default: auto
                      description: >-
                        Generated image aspect ratio. Default value: `auto`. Use
                        `auto` to let the system choose the aspect ratio
                        automatically.
                      examples:
                        - auto
                  x-apidog-orders:
                    - image_urls
                    - prompt
                    - aspect_ratio
              x-apidog-orders:
                - model
                - callBackUrl
                - input
            example:
              model: nano-banana-2-lite
              callBackUrl: https://your-domain.com/api/callback
              input:
                image_urls:
                  - >-
                    https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png
                prompt: Generate a pig on the grass, cinematic light
                aspect_ratio: auto
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                allOf:
                  - type: object
                    properties: {}
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          taskId:
                            type: string
                            description: >-
                              Task ID, which can be used to query task status
                              through the task detail endpoint.
                            examples:
                              - task_nanobanana_1765180586443
                        x-apidog-orders:
                          - taskId
                    x-apidog-orders:
                      - data
              example:
                code: 200
                msg: success
                data:
                  taskId: task_nanobanana_1765180586443
          headers: {}
          x-apidog-name: ''
      security:
        - BearerAuth: []
          x-apidog:
            required: true
            schemeGroups:
              - id: Wc7OEyHo3dCGMyxVPjC6O
                schemeIds:
                  - BearerAuth
            use:
              id: Wc7OEyHo3dCGMyxVPjC6O
      x-apidog-folder: docs/en/Market/Image    Models/Google
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-39045655-run
components:
  schemas: {}
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
