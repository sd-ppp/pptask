# Ideogram - Character

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
      summary: Ideogram - Character
      deprecated: false
      description: >-
        Image generation by ideogram/character


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
      operationId: ideogram-character
      tags:
        - docs/en/Market/Image    Models/Ideogram
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
                    - ideogram/character
                  default: ideogram/character
                  description: |-
                    The model name to use for generation. Required field.

                    - Must be `ideogram/character` for this endpoint
                  examples:
                    - ideogram/character
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
                    prompt:
                      description: >-
                        The prompt to fill the masked part of the image. (Max
                        length: 5000 characters)
                      type: string
                      maxLength: 5000
                      examples:
                        - >-
                          Place the woman from the uploaded portrait, wearing a
                          casual white blouse, in a peaceful garden setting. The
                          scene should feature vibrant green plants and colorful
                          flowers, with soft sunlight filtering through the
                          leaves. She should be sitting on a wooden bench,
                          holding a book and smiling gently. The background
                          should be filled with lush greenery, with a serene,
                          tranquil atmosphere. Golden afternoon light should
                          highlight the woman’s face and create soft shadows on
                          the ground, adding a peaceful, reflective mood to the
                          scene
                    reference_image_urls:
                      description: >-
                        A set of images to use as character references.
                        Currently only 1 image is supported, rest will be
                        ignored. (maximum total size 10MB across all character
                        references). The images should be in JPEG, PNG or WebP
                        format (File URL after upload, not file content;
                        Accepted types: image/jpeg, image/png, image/webp; Max
                        size: 10.0MB)
                      type: array
                      items:
                        type: string
                        format: uri
                      examples:
                        - - >-
                            https://file.aiquickdraw.com/custom-page/akr/section-images/1755767145415pvz49dpi.webp
                    rendering_speed:
                      description: 'The rendering speed to use. Default value: "BALANCED"'
                      type: string
                      enum:
                        - TURBO
                        - BALANCED
                        - QUALITY
                      default: BALANCED
                      examples:
                        - BALANCED
                    style:
                      description: >-
                        The style type to generate with. Cannot be used with
                        style_codes. Default value: "AUTO"
                      type: string
                      enum:
                        - AUTO
                        - REALISTIC
                        - FICTION
                      default: AUTO
                      examples:
                        - AUTO
                    expand_prompt:
                      description: >-
                        Determine if MagicPrompt should be used in generating
                        the request or not. Default value: true (Boolean value
                        (true/false))
                      type: boolean
                      examples:
                        - true
                    num_images:
                      description: Select description
                      type: string
                      enum:
                        - '1'
                        - '2'
                        - '3'
                        - '4'
                      default: '1'
                      examples:
                        - '1'
                    image_size:
                      description: >-
                        The resolution of the generated image Default value:
                        square_hd
                      type: string
                      enum:
                        - square
                        - square_hd
                        - portrait_4_3
                        - portrait_16_9
                        - landscape_4_3
                        - landscape_16_9
                      default: square_hd
                      examples:
                        - square_hd
                    seed:
                      description: Seed for the random number generator
                      type: integer
                    negative_prompt:
                      description: >-
                        Description of what to exclude from an image.
                        Descriptions in the prompt take precedence to
                        descriptions in the negative prompt. Default value: ""
                        (Max length: 5000 characters)
                      type: string
                      maxLength: 5000
                      examples:
                        - ''
                  required:
                    - prompt
                    - reference_image_urls
                  x-apidog-orders:
                    - prompt
                    - reference_image_urls
                    - rendering_speed
                    - style
                    - expand_prompt
                    - num_images
                    - image_size
                    - seed
                    - negative_prompt
                  x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: ideogram/character
              callBackUrl: https://your-domain.com/api/callback
              input:
                prompt: >-
                  Place the woman from the uploaded portrait, wearing a casual
                  white blouse, in a peaceful garden setting. The scene should
                  feature vibrant green plants and colorful flowers, with soft
                  sunlight filtering through the leaves. She should be sitting
                  on a wooden bench, holding a book and smiling gently. The
                  background should be filled with lush greenery, with a serene,
                  tranquil atmosphere. Golden afternoon light should highlight
                  the woman’s face and create soft shadows on the ground, adding
                  a peaceful, reflective mood to the scene
                reference_image_urls:
                  - >-
                    https://file.aiquickdraw.com/custom-page/akr/section-images/1755767145415pvz49dpi.webp
                rendering_speed: BALANCED
                style: AUTO
                expand_prompt: true
                num_images: '1'
                image_size: square_hd
                negative_prompt: ''
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
                  taskId: task_ideogram_1765179922911
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
      x-apidog-folder: docs/en/Market/Image    Models/Ideogram
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-28506379-run
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
