# PixVerse V6 Video Extension

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
      summary: PixVerse V6 Video Extension
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
      operationId: pixverse-v6-video-extension
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
                    - pixverse-v6/extend
                  default: pixverse-v6/extend
                  x-apidog-enum:
                    - value: pixverse-v6/extend
                      name: ''
                      description: ''
                  examples:
                    - pixverse-v6/extend
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    The callback URL to receive the completion notification of
                    the generation task. Optional, but recommended for
                    production environments.


                    After the task generation is completed, the system will push
                    the task status and results to this URL via POST request


                    The callback content includes the URL of the generated
                    content and task-related information


                    Your callback API must support POST requests and
                    JSON-formatted request bodies


                    Alternatively, you can actively poll the task status by
                    calling the task details API
                  examples:
                    - https://example.com/callback
                input:
                  anyOf:
                    - type: object
                      properties:
                        prompt:
                          type: string
                          description: >-
                            Generate prompt, cannot be empty, length is limited
                            to 3-5000 characters.
                          minLength: 3
                          maxLength: 5000
                          examples:
                            - A cat walking on the beach at sunset
                        duration:
                          type: integer
                          description: >-
                            Generated video duration in seconds. Current
                            validation range is 1-15.
                          minimum: 1
                          maximum: 15
                          examples:
                            - 5
                        quality:
                          type: string
                          description: Resolution.
                          enum:
                            - 360p
                            - 540p
                            - 720p
                            - 1080p
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
                            - 1080p
                        generate_audio_switch:
                          type: boolean
                          description: 'Whether to generate audio. '
                          examples:
                            - false
                        seed:
                          type: integer
                          description: Random seed, optional. Range 0-2147483647.
                          minimum: 0
                          maximum: 2147483647
                          examples:
                            - 42
                        taskId:
                          type: string
                          description: >-
                            The taskId of the parent video task to be extended.
                            The parent task must belong to the current user, be
                            undeleted, and have a status of success. KIE does
                            not accept official source_video_id/video_id. Please
                            be aware that video_url and taskId are mutually
                            exclusive — only one parameter may be submitted.
                          examples:
                            - task_abc123456
                      x-apidog-orders:
                        - prompt
                        - duration
                        - quality
                        - generate_audio_switch
                        - seed
                        - taskId
                      title: TaskId
                      description: Input parameters for the generation task
                      required:
                        - prompt
                        - duration
                        - quality
                        - taskId
                      x-apidog-ignore-properties: []
                    - type: object
                      properties:
                        prompt:
                          type: string
                          description: >-
                            Generate prompt, cannot be empty, length is limited
                            to 3-5000 characters.
                          minLength: 3
                          maxLength: 5000
                          examples:
                            - A cat walking on the beach at sunset
                        duration:
                          type: integer
                          description: >-
                            Generated video duration in seconds. Current
                            validation range is 1-15.
                          minimum: 1
                          maximum: 15
                          examples:
                            - 5
                        quality:
                          type: string
                          description: Resolution.
                          enum:
                            - 360p
                            - 540p
                            - 720p
                            - 1080p
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
                            - 1080p
                        generate_audio_switch:
                          type: boolean
                          description: 'Whether to generate audio. '
                          examples:
                            - false
                        seed:
                          type: integer
                          description: Random seed, optional. Range 0-2147483647.
                          minimum: 0
                          maximum: 2147483647
                          examples:
                            - 42
                        video_url:
                          type: string
                          description: >-
                            To extend the video, please supply the URL. Please
                            be aware that video_url and taskId are mutually
                            exclusive — only one parameter may be submitted.
                      x-apidog-orders:
                        - prompt
                        - duration
                        - quality
                        - generate_audio_switch
                        - seed
                        - video_url
                      description: Input parameters for the generation task
                      required:
                        - prompt
                        - duration
                        - quality
                        - video_url
                      title: Video
                      x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: pixverse-v6/extend
              input:
                prompt: Continue the same camera motion and extend the scene naturally
                taskId: parent_task_id_from_previous_success_video
                duration: 5
                quality: 720p
                generate_audio_switch: false
                seed: 123456
              callBackUrl: https://example.com/kie/callback
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
      x-apidog-folder: docs/en/Market/Video Models/PixVerse
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-40433692-run
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
