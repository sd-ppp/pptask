# Bytedance Seedance 1.5 Pro

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
      summary: Bytedance Seedance 1.5 Pro
      deprecated: false
      description: >
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


        ## Key Features


        <CardGroup cols={2}>
          <Card title="Text-to-Video" icon="lucide-wand-sparkles">
            Generate videos directly from text descriptions without input images
          </Card>
          <Card title="Image-to-Video" icon="lucide-images">
            Animate static images with 0-2 input images support
          </Card>
          <Card title="Dynamic Camera" icon="lucide-camera">
            Advanced camera movement with optional lens locking for stable shots
          </Card>
          <Card title="Audio Generation" icon="lucide-volume-2">
            Optional audio generation for enhanced video content
          </Card>
        </CardGroup>


        ::: note[]

        **Audio Generation**: Enabling the `generate_audio` feature will
        increase the generation cost. Use it when audio is essential for your
        video content.

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
      operationId: bytedance-seedance-1-5-pro
      tags:
        - docs/en/Market/Video Models/Bytedance
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
                    - bytedance/seedance-1.5-pro
                  default: bytedance/seedance-1.5-pro
                  description: |-
                    The model name to use for generation. Required field.

                    - Must be `bytedance/seedance-1.5-pro` for this endpoint
                  examples:
                    - bytedance/seedance-1.5-pro
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
                      type: string
                      description: >-
                        The text prompt used to generate the video. Required
                        field. (Min length: 3, Max length: 20000 characters)
                      minLength: 3
                      maxLength: 20000
                      examples:
                        - >-
                          A serene beach at sunset with waves gently crashing on
                          the shore, palm trees swaying in the breeze, and
                          seagulls flying across the orange sky
                    input_urls:
                      description: >-
                        URLs of input images for image-to-video generation.
                        Optional field.


                        - Accepts 0-2 images

                        - If not provided, the model will perform text-to-video
                        generation

                        - File URLs after upload, not file content

                        - Accepted types: image/jpeg, image/png, image/webp

                        - Max size per image: 10.0MB
                      type: array
                      items:
                        type: string
                        format: uri
                      maxItems: 2
                      examples:
                        - - >-
                            https://file.aiquickdraw.com/custom-page/akr/section-images/example1.png
                    aspect_ratio:
                      description: Video aspect ratio configuration. Required field.
                      type: string
                      enum:
                        - '1:1'
                        - '4:3'
                        - '3:4'
                        - '16:9'
                        - '9:16'
                        - '21:9'
                      default: '1:1'
                      examples:
                        - '1:1'
                    resolution:
                      description: >-
                        Video resolution - 480p for faster generation, 720p for
                        balance, 1080p for higher quality
                      type: string
                      enum:
                        - 480p
                        - 720p
                        - 1080p
                      default: 720p
                      examples:
                        - 720p
                    duration:
                      type: number
                      description: Duration of the video in seconds,Optional range 4-12 s
                    fixed_lens:
                      description: >-
                        Seedance adds dynamic camera movement. Enable this
                        feature to lock the camera for stable, static shots.


                        - **true**: Lock camera for static shots

                        - **false**: Allow dynamic camera movement
                      type: boolean
                      default: false
                      examples:
                        - false
                    generate_audio:
                      description: |-
                        Whether to generate audio for the video.

                        - **true**: Generate with audio (higher cost)
                        - **false**: Generate without audio

                        Note: Enabling audio will increase the generation cost
                      type: boolean
                      default: false
                      examples:
                        - false
                    nsfw_checker:
                      type: boolean
                      description: >-
                        Defaults to false. You can set it to false based on your
                        needs. If set to false, our content filtering will be
                        disabled, and all results will be returned directly by
                        the model itself.

                        Note: There is no guarantee that everything can be
                        filtered out; if you are not satisfied with the results,
                        you will need to make your own arrangements.
                  required:
                    - prompt
                    - aspect_ratio
                    - duration
                  x-apidog-orders:
                    - prompt
                    - input_urls
                    - aspect_ratio
                    - resolution
                    - duration
                    - fixed_lens
                    - generate_audio
                    - 01KWKMQGWN2MCZ227HK20TQZE6
                  x-apidog-refs:
                    01KWKMQGWN2MCZ227HK20TQZE6:
                      $ref: '#/components/schemas/nsfw_checker'
                  x-apidog-ignore-properties:
                    - nsfw_checker
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: bytedance/seedance-1.5-pro
              callBackUrl: https://your-domain.com/api/callback
              input:
                prompt: >-
                  A serene beach at sunset with waves gently crashing on the
                  shore, palm trees swaying in the breeze, and seagulls flying
                  across the orange sky
                input_urls:
                  - >-
                    https://file.aiquickdraw.com/custom-page/akr/section-images/example1.png
                aspect_ratio: '1:1'
                resolution: 720p
                duration: 8
                fixed_lens: false
                generate_audio: false
                nsfw_checker: false
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
                  taskId: task_bytedance_1765186743319
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
      x-apidog-folder: docs/en/Market/Video Models/Bytedance
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-28506397-run
components:
  schemas:
    nsfw_checker:
      type: object
      properties:
        nsfw_checker:
          type: boolean
          description: >-
            Defaults to false. You can set it to false based on your needs. If
            set to false, our content filtering will be disabled, and all
            results will be returned directly by the model itself.

            Note: There is no guarantee that everything can be filtered out; if
            you are not satisfied with the results, you will need to make your
            own arrangements.
      x-apidog-orders:
        - nsfw_checker
      x-apidog-ignore-properties: []
      x-apidog-folder: ''
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
