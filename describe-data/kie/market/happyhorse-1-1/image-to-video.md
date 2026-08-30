# HappyHorse-1-1 image-to-video

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
      summary: HappyHorse-1-1 image-to-video
      deprecated: false
      description: >-

        ## Query Task Status

        After submitting the task, you can check the progress of the task and
        obtain the generated results through the unified query endpoint: 

        <Card title="Get Task Details" icon="lucide-search"
        href="/market/common/get-task-detail">
         Learn how to check the task status and obtain the generated results 
        </Card> 


        ::: tip[]

        In the production environment, it is recommended to use the
        "callBackUrl" parameter to receive the automatic notification upon
        completion of the generation, rather than polling the status endpoint. 

        :::


        Related resources

        <CardGroup cols={2}>
          <Card title="Market Overview" icon="lucide-store" href="/market/quickstart"> View all available models </Card>
          <Card title="General API" icon="lucide-cog" href="/common-api/get-account-credits"> View account credits and usage </Card>
        </CardGroup>
      operationId: playground_252
      tags:
        - docs/en/Market/Video Models/HappyHorse
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required:
                - model
                - input
              properties:
                model:
                  type: string
                  enum:
                    - happyhorse-1-1/image-to-video
                  default: happyhorse-1-1/image-to-video
                  description: >-
                    The model name used for generation. This endpoint must use
                    `happyhorse-1-1/image-to-video`.
                input:
                  type: object
                  additionalProperties: false
                  description: Input parameters for the generation task.
                  properties:
                    prompt:
                      type: string
                      description: >-
                        Describes the video content to generate. Supports any
                        language. Maximum: 5,000 non-Chinese characters or 2,500
                        Chinese
                      maxLength: 5000
                      default: ''
                      examples:
                        - ''
                    image_urls:
                      type: array
                      items:
                        type: string
                        format: uri
                      description: >-
                        The URL of the first frame image. 

                        Image constraints: 

                        1. Formats: JPEG, JPG, PNG, WEBP. 

                        2. Resolution: Width and height must both be at least
                        300 pixels. 

                        3. Aspect ratio: Between 1:2.5 and 2.5:1. 

                        4. File size: Up to 20 MB.
                      maxItems: 1
                      default:
                        - ''
                      examples:
                        - - ''
                    resolution:
                      type: string
                      enum:
                        - 720p
                        - 1080p
                      description: |-
                        The resolution of the generated video.
                        Options: 720p; 1080p
                      default: 1080p
                      examples:
                        - 1080p
                    duration:
                      type: number
                      description: >-
                        The duration of the generated video, in seconds.  The
                        value must be an integer in the range [3, 15]. Default:
                        5
                      minimum: 3
                      maximum: 15
                      multipleOf: 1
                      default: 5
                      examples:
                        - 5
                  required:
                    - image_urls
                  x-apidog-orders:
                    - prompt
                    - image_urls
                    - resolution
                    - duration
                  x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - input
              x-apidog-ignore-properties: []
            example:
              model: happyhorse-1-1/image-to-video
              input:
                image_urls:
                  - >-
                    https://static.aiquickdraw.com/tools/example/1782114387854_IufKnPxR.png
                prompt: A cat running on the grass
                resolution: 1080p
                duration: 5
      responses:
        '200':
          description: Request Successful
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
                      - 01KVQ4XDW4JED4JP570Q3RYR1D
                    required:
                      - data
                    x-apidog-refs:
                      01KVQ4XDW4JED4JP570Q3RYR1D:
                        $ref: '#/components/schemas/ApiResponse'
                    x-apidog-ignore-properties:
                      - code
                      - msg
                      - data
              example:
                code: 200
                msg: success
                data:
                  taskId: task_252_abc123
          headers: {}
          x-apidog-name: ''
      security:
        - BearerAuth1: []
          x-apidog:
            schemeGroups:
              - id: ifvrQegtvClZy-mqqr4HP
                schemeIds:
                  - BearerAuth1
            required: true
            use:
              id: ifvrQegtvClZy-mqqr4HP
            scopes:
              ifvrQegtvClZy-mqqr4HP:
                undefined: []
      x-apidog-folder: docs/en/Market/Video Models/HappyHorse
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-38307880-run
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
