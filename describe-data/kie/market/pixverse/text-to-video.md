# PixVerse V6 Text-to-Video

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
      summary: PixVerse V6 Text-to-Video
      deprecated: false
      description: >-
        ## Query Task Status

        After submitting a task, you can check its progress and retrieve the
        result through the unified query endpoint:

        <Card title="Get Task Details" icon="magnifying-glass"
        href="/market/common/get-task-detail">
          Learn how to check task status and retrieve the generated result
        </Card>


        ::: tip[]

        In production, we recommend using the `callBackUrl` parameter to receive
        an automatic notification when generation is complete instead of polling
        the status endpoint.

        :::


        ## Related Resources

        <CardGroup cols={2}>
          <Card title="Market Overview" icon="store" href="/market/quickstart">
            Browse all available models
          </Card>
          <Card title="Common API" icon="gear" href="/common-api/get-account-credits">
            View account credits and usage
          </Card>
        </CardGroup>
      operationId: pixverse-v6-text-to-video
      tags:
        - docs/en/Market/Video Models/PixVerse
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
                  description: >-
                    The name of the model used for the generation task. Required
                    field.
                  enum:
                    - pixverse-v6/text-to-video
                  default: pixverse-v6/text-to-video
                  x-apidog-enum:
                    - value: pixverse-v6/text-to-video
                      name: ''
                      description: ''
                  examples:
                    - pixverse-v6/text-to-video
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    The callback URL to receive the completion notification of
                    the generation task. Optional configuration, recommended for
                    production environments.


                    - After the task generation is completed, the system will
                    push the task status and results to this URL via POST

                    - The callback content includes the URL of the generated
                    content and task-related information

                    - Your callback interface must support receiving POST
                    requests and JSON-formatted request bodies

                    - You can also actively poll the task status by calling the
                    task details interface
                  examples:
                    - https://your-domain.com/api/callback
                input:
                  type: object
                  description: Input parameters for the generation task
                  properties:
                    prompt:
                      type: string
                      description: >-
                        Generate prompt, cannot be empty, length is limited to
                        3-5000 characters.
                      minLength: 3
                      maxLength: 5000
                      examples:
                        - >-
                          A cinematic sunrise illuminates a mist-shrouded
                          mountain lake; the camera slowly sweeps across the
                          water's surface as a flock of birds flies overhead.
                    aspect_ratio:
                      type: string
                      description: >-
                        Output video aspect ratio. This parameter is supported
                        in text-to-video and Fusion multi-reference
                        image-to-video modes.
                      enum:
                        - '16:9'
                        - '4:3'
                        - '1:1'
                        - '3:4'
                        - '9:16'
                        - '2:3'
                        - '3:2'
                        - '21:9'
                      default: '16:9'
                      x-apidog-enum:
                        - value: '16:9'
                          name: ''
                          description: ''
                        - value: '4:3'
                          name: ''
                          description: ''
                        - value: '1:1'
                          name: ''
                          description: ''
                        - value: '3:4'
                          name: ''
                          description: ''
                        - value: '9:16'
                          name: ''
                          description: ''
                        - value: '2:3'
                          name: ''
                          description: ''
                        - value: '3:2'
                          name: ''
                          description: ''
                        - value: '21:9'
                          name: ''
                          description: ''
                      examples:
                        - '16:9'
                    quality:
                      type: string
                      description: >-
                        Output video resolution. Supports 360p, 540p, 720p, and
                        1080p.
                      enum:
                        - 360p
                        - 540p
                        - 720p
                        - 1080p
                      default: 720p
                      x-apidog-enum:
                        - value: 360p
                          name: ''
                          description: ''
                        - value: 540p
                          name: ''
                          description: ''
                        - value: 720p
                          name: ''
                          description: ''
                        - value: 1080p
                          name: ''
                          description: ''
                      examples:
                        - 720p
                    duration:
                      type: integer
                      description: >-
                        Output video duration in seconds. PixVerse V6 supports
                        1–15 seconds.
                      minimum: 1
                      maximum: 15
                      default: 5
                      examples:
                        - 5
                    generate_audio_switch:
                      type: boolean
                      description: >-
                        Whether to generate audio synchronized with the video
                        content. 
                      default: false
                      examples:
                        - false
                    generate_multi_clip_switch:
                      type: boolean
                      description: 'Whether to generate a multi-clip video. '
                      default: false
                      examples:
                        - false
                    seed:
                      type: integer
                      description: >-
                        Random seed, value range is 0–2147483647. Using the same
                        parameters and seed helps improve result
                        reproducibility.
                      minimum: 0
                      maximum: 2147483647
                      examples:
                        - 123456789
                  x-apidog-orders:
                    - prompt
                    - aspect_ratio
                    - quality
                    - duration
                    - generate_audio_switch
                    - generate_multi_clip_switch
                    - seed
                  required:
                    - prompt
                    - aspect_ratio
                    - quality
                    - duration
                  x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            examples: {}
      responses:
        '200':
          description: 请求成功
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
          headers: {}
          x-apidog-name: ''
      security:
        - BearerAuth: []
          x-apidog:
            schemeGroups:
              - id: e5011825f4be4df6ad511
                schemeIds:
                  - BearerAuth
            required: true
            use:
              id: e5011825f4be4df6ad511
            scopes:
              e5011825f4be4df6ad511:
                undefined: []
      x-apidog-folder: docs/en/Market/Video Models/PixVerse
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-40433689-run
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
