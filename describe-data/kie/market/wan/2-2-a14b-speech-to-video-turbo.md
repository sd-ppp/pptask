# Wan - 2.2 A14B Speech to Video Turbo

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
      summary: Wan - 2.2 A14B Speech to Video Turbo
      deprecated: false
      description: >-
        Generate videos using Wan's advanced AI model


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
      operationId: wan-2-2-a14b-speech-to-video-turbo
      tags:
        - docs/en/Market/Video Models/Wan
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
                    - wan/2-2-a14b-speech-to-video-turbo
                  default: wan/2-2-a14b-speech-to-video-turbo
                  description: >-
                    The model name to use for generation. Required field.


                    - Must be `wan/2-2-a14b-speech-to-video-turbo` for this
                    endpoint
                  examples:
                    - wan/2-2-a14b-speech-to-video-turbo
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
                        The text prompt used for video generation (Max length:
                        5000 characters)
                      type: string
                      maxLength: 5000
                      examples:
                        - The lady is talking
                    image_url:
                      description: >-
                        URL of the input image. If the input image does not
                        match the chosen aspect ratio, it is resized and center
                        cropped (File URL after upload, not file content;
                        Accepted types: image/jpeg, image/png, image/webp; Max
                        size: 10.0MB)
                      type: string
                      examples:
                        - >-
                          https://file.aiquickdraw.com/custom-page/akr/section-images/1756797663082u4pjmcrq.png
                    audio_url:
                      description: >-
                        The URL of the audio file (File URL after upload, not
                        file content; Accepted types: audio/mp3, audio/wav,
                        audio/ogg, audio/m4a, audio/flac, audio/aac,
                        audio/x-ms-wma, audio/mpeg; Max size: 10.0MB)
                      type: string
                      examples:
                        - >-
                          https://file.aiquickdraw.com/custom-page/akr/section-images/17567977044127d1emlmc.mp3
                    num_frames:
                      description: >-
                        Number of frames to generate. Must be between 40 to 120,
                        (must be multiple of 4) (Min: 40, Max: 120, Step: 4)
                        (step: 4)
                      type: number
                      minimum: 40
                      maximum: 120
                      default: 80
                      examples:
                        - 80
                    frames_per_second:
                      description: >-
                        Frames per second of the generated video. Must be
                        between 4 to 60. When using interpolation and
                        adjust_fps_for_interpolation is set to true (default
                        true,) the final FPS will be multiplied by the number of
                        interpolated frames plus one. For example, if the
                        generated frames per second is 16 and the number of
                        interpolated frames is 1, the final frames per second
                        will be 32. If adjust_fps_for_interpolation is set to
                        false, this value will be used as-is (Min: 4, Max: 60,
                        Step: 1) (step: 1)
                      type: number
                      minimum: 4
                      maximum: 60
                      default: 16
                      examples:
                        - 16
                    resolution:
                      description: Resolution of the generated video (480p, 580p, or 720p)
                      type: string
                      enum:
                        - 480p
                        - 580p
                        - 720p
                      default: 480p
                      examples:
                        - 480p
                    negative_prompt:
                      description: >-
                        Negative prompt for video generation (Max length: 500
                        characters)
                      type: string
                      maxLength: 500
                      examples:
                        - ''
                    seed:
                      description: >-
                        Random seed for reproducibility. If None, a random seed
                        is chosen
                      type: integer
                    num_inference_steps:
                      description: >-
                        Number of inference steps for sampling. Higher values
                        give better quality but take longer (Min: 2, Max: 40,
                        Step: 1) (step: 1)
                      type: number
                      minimum: 2
                      maximum: 40
                      default: 27
                      examples:
                        - 27
                    guidance_scale:
                      description: >-
                        Classifier-free guidance scale. Higher values give
                        better adherence to the prompt but may decrease quality
                        (Min: 1, Max: 10, Step: 0.1) (step: 0.1)
                      type: number
                      minimum: 1
                      maximum: 10
                      default: 3.5
                      examples:
                        - 3.5
                    shift:
                      description: >-
                        Shift value for the video. Must be between 1.0 and 10.0
                        (Min: 1, Max: 10, Step: 0.1) (step: 0.1)
                      type: number
                      minimum: 1
                      maximum: 10
                      default: 5
                      examples:
                        - 5
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
                    - image_url
                    - audio_url
                  x-apidog-orders:
                    - prompt
                    - image_url
                    - audio_url
                    - num_frames
                    - frames_per_second
                    - resolution
                    - negative_prompt
                    - seed
                    - num_inference_steps
                    - guidance_scale
                    - shift
                    - 01KWKNVT27CG4VA146TDGP3KKG
                  x-apidog-refs:
                    01KWKNVT27CG4VA146TDGP3KKG:
                      $ref: '#/components/schemas/nsfw_checker'
                  x-apidog-ignore-properties:
                    - nsfw_checker
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: wan/2-2-a14b-speech-to-video-turbo
              callBackUrl: https://your-domain.com/api/callback
              input:
                prompt: The lady is talking
                image_url: >-
                  https://file.aiquickdraw.com/custom-page/akr/section-images/1756797663082u4pjmcrq.png
                audio_url: >-
                  https://file.aiquickdraw.com/custom-page/akr/section-images/17567977044127d1emlmc.mp3
                num_frames: 80
                frames_per_second: 16
                resolution: 480p
                negative_prompt: ''
                num_inference_steps: 27
                guidance_scale: 3.5
                shift: 5
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
                  taskId: task_wan_1765186497670
          headers: {}
          x-apidog-name: ''
        '500':
          description: request failed
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    description: >-
                      Response status code


                      - **200**: Success - Request has been processed
                      successfully

                      - **401**: Unauthorized - Authentication credentials are
                      missing or invalid

                      - **402**: Insufficient Credits - Account does not have
                      enough credits to perform the operation

                      - **404**: Not Found - The requested resource or endpoint
                      does not exist

                      - **408**: Upstream is currently experiencing service
                      issues. No result has been returned for over 10 minutes.

                      - **422**: Validation Error - The request parameters
                      failed validation checks

                      - **429**: Rate Limited - Request limit has been exceeded
                      for this resource

                      - **455**: Service Unavailable - System is currently
                      undergoing maintenance

                      - **500**: Server Error - An unexpected error occurred
                      while processing the request

                      - **501**: Generation Failed - Content generation task
                      failed

                      - **505**: Feature Disabled - The requested feature is
                      currently disabled
                  msg:
                    type: string
                    description: Response message, error description when failed
                  data:
                    type: object
                    properties: {}
                    x-apidog-orders: []
                    x-apidog-ignore-properties: []
                x-apidog-orders:
                  - code
                  - msg
                  - data
                required:
                  - code
                  - msg
                  - data
                x-apidog-ignore-properties: []
              example:
                code: 500
                msg: >-
                  Server Error - An unexpected error occurred while processing
                  the request
                data: null
          headers: {}
          x-apidog-name: 'Error '
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
      x-apidog-folder: docs/en/Market/Video Models/Wan
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-28506417-run
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
