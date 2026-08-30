# Omnihuman 1.5 Human Identification

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
      summary: Omnihuman 1.5 Human Identification
      deprecated: false
      description: >-
        ## Create Task


        Calling this interface creates a new task for recognizing human
        portraits, human-like figures, or anthropomorphic subjects. Upload a
        portrait image, and the model will detect and identify the human
        subjects in the image.


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
      operationId: omnihuman-1-5-human-identification
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
                    - omnihuman-1-5/human-identification
                  default: omnihuman-1-5/human-identification
                  description: >-
                    The model name used for human identification. This field is
                    required.


                    - This endpoint must use the
                    `omnihuman-1-5/human-identification` model
                  examples:
                    - omnihuman-1-5/human-identification
                input:
                  type: object
                  description: Input parameters for the human identification task.
                  required:
                    - image_url
                  properties:
                    image_url:
                      type: string
                      format: uri
                      description: >-
                        Portrait image URL. Requirements: JPG/PNG/JPEG format,
                        less than 5MB, resolution under 4096x4096. Recommended:
                        single person facing forward, with the face occupying a
                        large proportion of the image. Accepted file types:
                        image/jpeg, image/png, image/jpg. Max file size: 5MB.
                  x-apidog-orders:
                    - image_url
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
            example:
              model: omnihuman-1-5/human-identification
              input:
                image_url: https://your-domain.com/image/portrait.png
              callBackUrl: https://your-domain.com/api/callback
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                allOf:
                  - type: object
                    properties: {}
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          taskId:
                            type: string
                            description: >-
                              Task ID, which can be used to query task status
                              through the task detail endpoint.
                            examples:
                              - >-
                                task_omnihuman-1-5-human-identification_1234567890
                        x-apidog-orders:
                          - taskId
                    x-apidog-orders:
                      - data
              example:
                code: 200
                msg: success
                data:
                  taskId: task_omnihuman-1-5-human-identification_1234567890
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
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-37876494-run
components:
  schemas: {}
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
