# MiniMax H3 Image-to-Video

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
      summary: MiniMax H3 Image-to-Video
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
      operationId: minimax-h3-image-to-video
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
                    MiniMax H3 image-to-video.
                  enum:
                    - minimax-h3/image-to-video
                  default: minimax-h3/image-to-video
                  x-apidog-enum:
                    - value: minimax-h3/image-to-video
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
                          Let the character in the scene turn around naturally
                          and smile, camera slowly pushing forward
                    first_frame_url:
                      type: string
                      description: >-
                        First frame image URL. Note: Either first_frame_url or
                        last_frame_url must be provided. Supports HTTP, HTTPS,
                        and OSS addresses; supports JPG, JPEG, PNG, WEBP, HEIC,
                        HEIF formats; single image size not exceeding 30 MB,
                        image side length between 256 and 5760 pixels, aspect
                        ratio between 0.4 and 2.5.
                      pattern: ^(https?|oss)://
                      format: uri
                      examples:
                        - https://example.com/first-frame.jpg
                    last_frame_url:
                      type: string
                      description: >-
                        Last frame image URL. Note: Either first_frame_url or
                        last_frame_url must be provided. Image restrictions are
                        the same as first_frame_url.
                      pattern: ^(https?|oss)://
                      format: uri
                      examples:
                        - https://example.com/last-frame.jpg
                    duration:
                      type: integer
                      description: >-
                        Generated video duration, supporting integer values from
                        4 to 15 seconds.
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
                  anyOf:
                    - type: string
                    - type: string
                  x-apidog-orders:
                    - prompt
                    - first_frame_url
                    - last_frame_url
                    - duration
                  x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              examples:
                - model: minimax-h3/image-to-video
                  callBackUrl: https://example.com/callback
                  input:
                    prompt: >-
                      Let the character in the scene turn around naturally and
                      smile, camera slowly pushing forward
                    first_frame_url: https://example.com/first-frame.jpg
                    last_frame_url: https://example.com/last-frame.jpg
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
        - BearerAuth: []
          x-apidog:
            schemeGroups:
              - id: e5215e147f1a4de49eeac
                schemeIds:
                  - BearerAuth
            required: true
            use:
              id: e5215e147f1a4de49eeac
            scopes:
              e5215e147f1a4de49eeac:
                undefined: []
      x-apidog-folder: docs/en/Market/Video Models/MiniMax H3
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-41000885-run
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
