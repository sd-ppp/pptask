# Grok Imagine Video 1.5 Preview

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
      summary: Grok Imagine Video 1.5 Preview
      deprecated: false
      description: >-
        ## Create Task


        Use this endpoint to create a new text-to-video generation task.


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
      operationId: GrokImagineVideo15PreviewCreateTask
      tags:
        - docs/en/Market/Video Models/Grok Imagine
        - generated/grok-imagine-video-1.5-preview
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  description: >-
                    The model name used for generation. This endpoint must use
                    `grok-imagine-video-1-5-preview`.
                  enum:
                    - grok-imagine-video-1-5-preview
                  default: grok-imagine-video-1-5-preview
                  x-apidog-enum:
                    - value: grok-imagine-video-1-5-preview
                      name: ''
                      description: ''
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    Optional callback URL for task completion notifications. If
                    provided, the system will send a POST request to this URL
                    when the task completes.
                input:
                  type: object
                  description: Input parameters for the generation task.
                  additionalProperties: false
                  properties:
                    prompt:
                      type: string
                      description: >-
                        Prompt for video generation. Maximum length: 4096
                        characters.
                      maxLength: 4096
                    image_urls:
                      type: array
                      items:
                        type: string
                        format: uri
                      description: >-
                        Upload image files to be used as API input. Supported
                        file types: image/jpeg, image/png, image/webp,
                        image/jpg. Maximum file size: 20MB. Supports multi-file
                        upload, up to 7 file.
                      maxItems: 7
                    aspect_ratio:
                      type: string
                      description: >-
                        The aspect ratio of the video. This parameter is invalid
                        if it is a single image.
                      enum:
                        - '1:1'
                        - '16:9'
                        - '9:16'
                        - '3:2'
                        - '2:3'
                        - auto
                      x-apidog-enum:
                        - value: '1:1'
                          name: ''
                          description: ''
                        - value: '16:9'
                          name: ''
                          description: ''
                        - value: '9:16'
                          name: ''
                          description: ''
                        - value: '3:2'
                          name: ''
                          description: ''
                        - value: '2:3'
                          name: ''
                          description: ''
                        - value: auto
                          name: ''
                          description: ''
                      default: auto
                      examples:
                        - auto
                    resolution:
                      description: Resolution for video generation.
                      type: string
                      enum:
                        - 480p
                        - 720p
                      default: 480p
                    duration:
                      description: >-
                        Video duration in seconds. Range: [1, 15]. Default: 8.
                        Minimum: 1. Maximum: 15. Step: 1.
                      type: integer
                      minimum: 1
                      maximum: 15
                      multipleOf: 1
                      default: 8
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
                  x-apidog-orders:
                    - prompt
                    - image_urls
                    - aspect_ratio
                    - resolution
                    - duration
                    - 01KWKMHB0TTBF3NCABSPH30YV4
                  x-apidog-refs:
                    01KWKMHB0TTBF3NCABSPH30YV4:
                      $ref: '#/components/schemas/nsfw_checker'
                  x-apidog-ignore-properties:
                    - nsfw_checker
              x-apidog-refs: {}
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              required:
                - model
                - input
              x-apidog-ignore-properties: []
            examples:
              default:
                value:
                  model: grok-imagine-video-1-5-preview
                  input:
                    prompt: Describe the scene you want to generate.
                    image_urls:
                      - https://your-domain.com/image/example.png
                    aspect_ratio: '16:9'
                    resolution: 480p
                    duration: 8
                  callBackUrl: https://your-domain.com/api/callback
                summary: Example request
      responses:
        '200':
          description: Request successful.
          content:
            application/json:
              schema:
                type: object
                x-apidog-refs:
                  01KT1GWQMF70CBVDJKT33BKBCV:
                    $ref: '#/components/schemas/ApiResponseWithRecordId'
                x-apidog-orders:
                  - 01KT1GWQMF70CBVDJKT33BKBCV
                properties:
                  code:
                    type: integer
                    enum:
                      - 200
                      - 401
                      - 402
                      - 404
                      - 422
                      - 429
                      - 455
                      - 500
                      - 501
                      - 505
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
                    examples:
                      - success
                  data:
                    type: object
                    properties:
                      taskId:
                        type: string
                        description: >-
                          Task ID, can be used with Get Task Details endpoint to
                          query task status
                      recordId:
                        type: string
                        description: Record ID, can be used to get the record details
                    x-apidog-orders:
                      - taskId
                      - recordId
                    x-apidog-ignore-properties: []
                required:
                  - data
                x-apidog-ignore-properties:
                  - code
                  - msg
                  - data
              examples:
                success:
                  summary: Success response
                  value:
                    code: 200
                    msg: success
                    data:
                      taskId: task_grok-imagine-video-1.5-preview_1234567890
          headers: {}
          x-apidog-name: ''
      security:
        - BearerAuth1: []
          x-apidog:
            schemeGroups:
              - id: LhzUfVZBdr29eQi8xZ2jz
                schemeIds:
                  - BearerAuth1
            required: true
            use:
              id: LhzUfVZBdr29eQi8xZ2jz
            scopes:
              LhzUfVZBdr29eQi8xZ2jz:
                undefined: []
      x-apidog-folder: docs/en/Market/Video Models/Grok Imagine
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-36941122-run
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
    ApiResponseWithRecordId:
      type: object
      properties:
        code:
          type: integer
          enum:
            - 200
            - 401
            - 402
            - 404
            - 422
            - 429
            - 455
            - 500
            - 501
            - 505
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

            - **455**: Service Unavailable - System is currently undergoing
            maintenance

            - **500**: Server Error - An unexpected error occurred while
            processing the request

            - **501**: Generation Failed - Content generation task failed

            - **505**: Feature Disabled - The requested feature is currently
            disabled
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
            recordId:
              type: string
              description: Record ID, can be used to get the record details
          x-apidog-orders:
            - taskId
            - recordId
          x-apidog-ignore-properties: []
      x-apidog-orders:
        - code
        - msg
        - data
      title: response with recordId
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
