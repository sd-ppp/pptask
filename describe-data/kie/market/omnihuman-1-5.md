# Omnihuman 1.5

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
      summary: Omnihuman 1.5
      deprecated: false
      description: >-
        ## Create Task


        Use this endpoint to create a new audio-driven portrait animation task.
        Upload a portrait image and an audio file, and the model will generate a
        video of the subject speaking or moving in sync with the audio.


        <Card title="Get Task Details" icon="lucide-search"
        href="/market/common/get-task-detail">
          After submission, use the unified query endpoint to check task progress and retrieve results
        </Card>


        ::: tip[]

        For production use, we recommend providing the `callBackUrl` parameter
        so your service can receive completion notifications instead of polling
        for task status.

        :::


        ## File Upload


        ::: tip[]

        Need to upload files before calling this endpoint? See [File Upload API
        Quickstart](/file-upload-api/quickstart).

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
      operationId: omnihuman-1-5
      tags:
        - docs/en/Market/Video Models/OmniHuman
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
                    - omnihuman-1-5
                  default: omnihuman-1-5
                  description: |-
                    The model name used for generation. This field is required.

                    - This endpoint must use the `omnihuman-1-5` model
                  examples:
                    - omnihuman-1-5
                input:
                  type: object
                  description: >-
                    Input parameters for the audio-driven portrait animation
                    task.
                  required:
                    - image_url
                    - audio_url
                  properties:
                    image_url:
                      type: string
                      format: uri
                      description: >-
                        Portrait image URL. Supports any aspect ratio with
                        subjects including people, pets, anime, etc. Accepted
                        file types: image/jpeg, image/png, image/webp. Max file
                        size: 10MB.
                    mask_url:
                      type: array
                      items:
                        type: string
                        format: uri
                      maxItems: 5
                      description: >-
                        Optional mask image URL(s). To have a specific subject
                        in the image speak, use 'Subject Detection' to get the
                        corresponding mask image and pass it as input. Accepted
                        file types: image/jpeg, image/png, image/webp. Max file
                        size: 10MB. Multiple file upload is supported, up to 5
                        files.
                    audio_url:
                      type: string
                      format: uri
                      description: >-
                        Audio URL. Duration must be less than 60 seconds
                        (recommended 15 seconds or less; exceeding this will
                        cause quality degradation). Accepted file types:
                        audio/mpeg, audio/wav, audio/x-wav, audio/aac,
                        audio/ogg, audio/mp4. Max file size: 10MB.
                    prompt:
                      type: string
                      description: >-
                        Optional prompt text. Limited to Chinese, English,
                        Japanese, Korean, Spanish, and Indonesian. Recommended
                        300 characters or less. Maximum length: 1000 characters.
                      maxLength: 300
                    output_resolution:
                      type: string
                      enum:
                        - '720'
                        - '1080'
                      default: '1080'
                      description: |-
                        Output video resolution.

                        - `720`: 720P
                        - `1080`: 1080P (default)
                    pe_fast_mode:
                      type: boolean
                      default: false
                      description: >-
                        Fast mode. Sacrifices some quality to speed up
                        generation. Default value: `false`.
                    seed:
                      type: integer
                      default: -1
                      description: >-
                        Random seed. Default is `-1` (random). When using the
                        same positive integer and keeping all other parameters
                        identical, the result will be highly consistent.
                  x-apidog-orders:
                    - image_url
                    - mask_url
                    - audio_url
                    - prompt
                    - output_resolution
                    - pe_fast_mode
                    - seed
                  x-apidog-ignore-properties: []
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    Callback URL. Once the task is fully completed, kie will
                    send the result to the business webhook URL.
              x-apidog-orders:
                - model
                - input
                - callBackUrl
              x-apidog-ignore-properties: []
            example:
              model: omnihuman-1-5
              input:
                image_url: https://your-domain.com/image/portrait.png
                mask_url:
                  - https://your-domain.com/image/mask.png
                audio_url: https://your-domain.com/audio/speech.mp3
                prompt: A person speaking naturally with gentle expressions.
                output_resolution: '1080'
                pe_fast_mode: false
                seed: -1
              callBackUrl: https://your-domain.com/api/callback
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                allOf:
                  - type: object
                    properties:
                      code:
                        type: integer
                        description: >-
                          Response status code


                          - **200**: Success - Request has been processed
                          successfully

                          - **401**: Unauthorized - Authentication credentials
                          are missing or invalid

                          - **402**: Insufficient Credits - Account does not
                          have enough credits to perform the operation

                          - **404**: Not Found - The requested resource or
                          endpoint does not exist

                          - **422**: Validation Error - The request parameters
                          failed validation checks

                          - **429**: Rate Limited - Request limit has been
                          exceeded for this resource

                          - **433**: Request Limit - Sub-key Usage Exceeds Limit

                          - **455**: Service Unavailable - System is currently
                          undergoing maintenance

                          - **500**: Server Error - An unexpected error occurred
                          while processing the request

                          - **501**: Generation Failed - Content generation task
                          failed

                          - **505**: Feature Disabled - The requested feature is
                          currently disabled
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
                              Task ID, can be used with Get Task Details
                              endpoint to query task status
                        x-apidog-orders:
                          - taskId
                        required:
                          - taskId
                        x-apidog-ignore-properties: []
                    x-apidog-orders:
                      - 01KV7QY2EFNA3G5YVCSPGG8KCT
                    required:
                      - data
                    x-apidog-refs:
                      01KV7QY2EFNA3G5YVCSPGG8KCT:
                        $ref: '#/components/schemas/ApiResponse'
                    x-apidog-ignore-properties:
                      - code
                      - msg
                      - data
              example:
                code: 200
                msg: success
                data:
                  taskId: task_omnihuman-1-5_1234567890
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
      x-apidog-folder: docs/en/Market/Video Models/OmniHuman
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-37874920-run
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
