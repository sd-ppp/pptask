# Wan 2.5 - Image to Video

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
      summary: Wan 2.5 - Image to Video
      deprecated: false
      description: >
        Video generation by wan/2-5-image-to-video


        ## Create Task


        Use this endpoint to create a new image-to-video generation task.


        <Card title="Get Task Details" icon="lucide-search"
        href="/market/common/get-task-detail">
          After submission, use the unified query endpoint to check task progress and retrieve results
        </Card>


        ::: tip[]

        For production use, we recommend providing the `callBackUrl` parameter
        so your service can receive completion notifications instead of polling
        for task status.

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
      operationId: wan-2-5-image-to-video
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
                - input
              properties:
                model:
                  type: string
                  enum:
                    - wan/2-5-image-to-video
                  default: wan/2-5-image-to-video
                  description: |-
                    The model name used for generation. This field is required.

                    - This endpoint must use the `wan/2-5-image-to-video` model
                  examples:
                    - wan/2-5-image-to-video
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    Callback URL for task completion notifications. Optional
                    parameter. If provided, the system will send a POST request
                    to this URL when the task completes, whether it succeeds or
                    fails. If omitted, no callback notification will be sent.
                  examples:
                    - https://your-domain.com/api/callback
                input:
                  type: object
                  description: Input parameters for the image-to-video task.
                  required:
                    - prompt
                    - image_url
                    - duration
                  properties:
                    prompt:
                      type: string
                      maxLength: 800
                      description: >-
                        The text prompt describing the desired video motion.
                        Maximum length: 800 characters.
                      examples:
                        - >-
                          The same woman from the reference image looks directly
                          into the camera, takes a breath, then smiles brightly
                          and speaks with enthusiasm: "Have you heard? Alibaba
                          Wan 2.5 API is now available on Kie.ai!" Ambient
                          audio: quiet indoor atmosphere, soft natural room
                          tone. Camera: medium close-up, steady framing, natural
                          daylight mood, accurate lip-sync with dialogue.
                    image_url:
                      type: string
                      format: uri
                      description: >-
                        URL of the image to use as the first frame. Must be
                        publicly accessible.


                        - Please provide the URL of the uploaded file, not raw
                        file content

                        - Accepted types: `image/jpeg`, `image/png`,
                        `image/webp`

                        - Max size: 10.0MB
                      examples:
                        - >-
                          https://file.aiquickdraw.com/custom-page/akr/section-images/1758796480945qb63zxq8.webp
                    duration:
                      type: string
                      enum:
                        - '5'
                        - '10'
                      description: |-
                        The duration of the generated video in seconds.

                        - `5`: 5 seconds
                        - `10`: 10 seconds
                      examples:
                        - '5'
                    resolution:
                      type: string
                      enum:
                        - 720p
                        - 1080p
                      description: 'Video resolution. Valid values: `720p`, `1080p`.'
                      examples:
                        - 1080p
                    negative_prompt:
                      type: string
                      maxLength: 500
                      description: >-
                        Negative prompt used to describe content to avoid.
                        Maximum length: 500 characters.
                    enable_prompt_expansion:
                      type: boolean
                      description: |-
                        Whether to enable prompt rewriting using LLM.

                        - Boolean value: `true` / `false`
                      examples:
                        - true
                    seed:
                      type: integer
                      description: >-
                        Random seed for reproducibility. If omitted, a random
                        seed is chosen.
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
                    - image_url
                    - duration
                    - resolution
                    - negative_prompt
                    - enable_prompt_expansion
                    - seed
                    - 01KWKP0NVNJPEJJKQ01KF7QC97
                  x-apidog-refs:
                    01KWKP0NVNJPEJJKQ01KF7QC97:
                      $ref: '#/components/schemas/nsfw_checker'
                  x-apidog-ignore-properties:
                    - nsfw_checker
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: wan/2-5-image-to-video
              callBackUrl: https://your-domain.com/api/callback
              input:
                prompt: >-
                  The same woman from the reference image looks directly into
                  the camera, takes a breath, then smiles brightly and speaks
                  with enthusiasm: "Have you heard? Alibaba Wan 2.5 API is now
                  available on Kie.ai!" Ambient audio: quiet indoor atmosphere,
                  soft natural room tone. Camera: medium close-up, steady
                  framing, natural daylight mood, accurate lip-sync with
                  dialogue.
                image_url: >-
                  https://file.aiquickdraw.com/custom-page/akr/section-images/1758796480945qb63zxq8.webp
                duration: '5'
                resolution: 1080p
                negative_prompt: blurry, flicker, camera shake, distorted face, low quality
                enable_prompt_expansion: true
                seed: 123456
                nsfw_checker: false
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/ApiResponse'
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
                              - task_wan_1765180586443
                        x-apidog-orders:
                          - taskId
                        x-apidog-ignore-properties: []
                    x-apidog-orders:
                      - data
                    x-apidog-ignore-properties: []
              example:
                code: 200
                msg: success
                data:
                  taskId: task_wan_1765180586443
          headers: {}
          x-apidog-name: ''
        '500':
          description: 请求失败
          content:
            application/json:
              schema:
                type: object
                properties: {}
                x-apidog-orders: []
                x-apidog-ignore-properties: []
          headers: {}
          x-apidog-name: Error
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
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-31160219-run
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
