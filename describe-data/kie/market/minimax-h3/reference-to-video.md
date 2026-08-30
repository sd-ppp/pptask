# MiniMax H3 Reference-to-Video

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
      summary: MiniMax H3 Reference-to-Video
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
      operationId: minimax-h3-reference-to-video
      tags:
        - docs/en/Market/Video Models/MiniMax H3
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
                    The name of the model used for the generation task. Used for
                    MiniMax H3 reference-to-video.
                  enum:
                    - minimax-h3/reference-to-video
                  default: minimax-h3/reference-to-video
                  x-apidog-enum:
                    - value: minimax-h3/reference-to-video
                      name: ''
                      description: ''
                callBackUrl:
                  type: string
                  description: The callback URL after the task is completed.
                  format: uri
                input:
                  type: object
                  required:
                    - prompt
                    - duration
                  properties:
                    prompt:
                      type: string
                      description: >-
                        Video generation prompt, length is between 1 and 7000
                        characters.
                      minLength: 1
                      maxLength: 7000
                      examples:
                        - >-
                          Generate a continuous cinematic video referencing the
                          characters, actions, and scenes in the input material
                    reference_image_urls:
                      type: array
                      description: >-
                        Array of reference image URLs. Supports up to 9 images.
                        Supports HTTP, HTTPS, and OSS addresses; supported image
                        formats include JPG, JPEG, PNG, WEBP, HEIC, and HEIF; a
                        single image size cannot exceed 30 MB; the side length
                        of the image must be between 256 and 5760 pixels, and
                        the aspect ratio must be between 0.4 and 2.5.
                      maxItems: 9
                      items:
                        type: string
                        pattern: ^(https?|oss)://
                        format: uri
                      examples:
                        - - https://example.com/reference-image-1.jpg
                          - https://example.com/reference-image-2.jpg
                    reference_video_urls:
                      type: array
                      description: >-
                        Array of reference video URLs. Supports up to 3 videos.
                        Supports MP4, MOV; video encoding supports H.264, H.265,
                        audio encoding supports AAC, MP3; a single file size
                        cannot exceed 50 MB; the duration of a single segment is
                        2 to 15 seconds, and the total duration of all reference
                        videos cannot exceed 15 seconds; the video side length
                        must be between 256 and 5760 pixels, the aspect ratio
                        must be between 0.4 and 2.5, and the frame rate must be
                        between 23.976 and 60.
                      maxItems: 3
                      items:
                        type: string
                        pattern: ^(https?|oss)://
                        format: uri
                      examples:
                        - - https://example.com/reference-video.mp4
                    reference_audio_urls:
                      type: array
                      description: >-
                        Array of reference audio URLs. Supports up to 3 audios.
                        Supports WAV, MP3; a single file size cannot exceed 15
                        MB; the duration of a single segment is 2 to 15 seconds,
                        and the total duration of all reference audios cannot
                        exceed 15 seconds. reference_audio cannot be used alone,
                        it must be accompanied by reference_image or
                        reference_video.
                      maxItems: 3
                      items:
                        type: string
                        pattern: ^(https?|oss)://
                        format: uri
                      examples:
                        - - https://example.com/reference-audio.mp3
                    aspect_ratio:
                      type: string
                      description: >-
                        Video aspect ratio. The default is adaptive, or a
                        specific ratio can be specified.
                      enum:
                        - adaptive
                        - '21:9'
                        - '16:9'
                        - '4:3'
                        - '1:1'
                        - '3:4'
                        - '9:16'
                      default: adaptive
                      x-apidog-enum:
                        - value: adaptive
                          name: ''
                          description: ''
                        - value: '21:9'
                          name: ''
                          description: ''
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
                    duration:
                      type: integer
                      description: >-
                        The duration of the generated video, supporting integer
                        values from 4 to 15 seconds.
                      enum:
                        - 4
                        - 5
                        - 6
                        - 7
                        - 8
                        - 9
                        - 10
                        - 11
                        - 12
                        - 13
                        - 14
                        - 15
                      default: 6
                      minimum: 4
                      maximum: 15
                      examples:
                        - 6
                  allOf:
                    - anyOf:
                        - required:
                            - reference_image_urls
                          properties:
                            reference_image_urls:
                              type: string
                          x-apidog-orders:
                            - reference_image_urls
                          x-apidog-ignore-properties: []
                          type: object
                        - required:
                            - reference_video_urls
                          properties:
                            reference_video_urls:
                              type: string
                          x-apidog-orders:
                            - reference_video_urls
                          x-apidog-ignore-properties: []
                          type: object
                  x-apidog-orders:
                    - prompt
                    - reference_image_urls
                    - reference_video_urls
                    - reference_audio_urls
                    - aspect_ratio
                    - duration
                  x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              examples:
                - model: minimax-h3/reference-to-video
                  callBackUrl: https://example.com/callback
                  input:
                    prompt: >-
                      Generate a continuous cinematic video referencing the
                      characters, actions, and scenes in the input material
                    reference_image_urls:
                      - https://example.com/reference-image.jpg
                    reference_video_urls:
                      - https://example.com/reference-video.mp4
                    reference_audio_urls:
                      - https://example.com/reference-audio.mp3
                    aspect_ratio: adaptive
                    duration: 6
              x-apidog-ignore-properties: []
            examples: {}
      responses:
        '200':
          description: success
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
          headers: {}
          x-apidog-name: ''
      security:
        - BearerAuth1: []
          x-apidog:
            schemeGroups:
              - id: a5eb1d4486e4485ba333a
                schemeIds:
                  - BearerAuth1
            required: true
            use:
              id: a5eb1d4486e4485ba333a
            scopes:
              a5eb1d4486e4485ba333a:
                undefined: []
      x-apidog-folder: docs/en/Market/Video Models/MiniMax H3
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-41000887-run
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
