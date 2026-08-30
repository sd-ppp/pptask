# GPT 5.2

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /gpt-5-2/v1/chat/completions:
    post:
      summary: GPT 5.2
      deprecated: false
      description: >
        > GPT-5-2 API is a next-generation multimodal model with exceptional
        reasoning capabilities, supporting text and image inputs with Web Search
        grounding and adjustable reasoning effort.


        <CardGroup cols={2}>
          <Card title="Multimodal" icon="lucide-image">
            Supports text and image inputs
          </Card>
          <Card title="Real-time Search" icon="lucide-search">
            Web search grounding enabled
          </Card>
          <Card title="Reasoning Effort" icon="lucide-list-minus">
            Adjustable reasoning effort level
          </Card>
          <Card title="Flexible Roles" icon="lucide-users">
            Multiple message roles supported
          </Card>
        </CardGroup>


        ## Unified Media File Format


        :::caution


        In the `messages` parameter's `content` array, only images are
        supported. All image files use the same format structure:


        - The `type` field is always `"image_url"`

        - The `image_url` field name remains unchanged

        - The only thing that changes is the `url` value, which points to the
        corresponding image address


        For example: `{ type: 'image_url', image_url: { url: '...' } }`
        structure.


        :::


        ## Tools Parameter


        The `tools` parameter is an optional array that allows you to enable Web
        Search grounding.


        ### Web Search


        Use this format to enable Web Search grounding:


        ```json

        {
          "type": "function",
          "function": {
            "name": "web_search"
          }
        }

        ```


        This enables real-time information retrieval via Web Search.


        ## Response Example


        ```json

        {
          "id": "chatcmpl-example-123",
          "object": "chat.completion",
          "created": 1741569952,
          "model": "gpt-5-2",
          "choices": [
            {
              "index": 0,
              "message": {
                "role": "assistant",
                "content": "hello,can i help you?",
                "refusal": null,
                "annotations": []
              },
              "logprobs": null,
              "finish_reason": "stop"
            }
          ],
          "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 50,
            "total_tokens": 60
          }
        }

        ```
      operationId: gpt-5-2-chat-completions
      tags:
        - docs/en/Market/Chat  Models/GPT
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                messages:
                  type: array
                  description: >-
                    An array of message objects. Each message has a role and
                    content.


                    **Unified Media File Format:**


                    In the content array, only images are supported. All image
                    files use the same format structure:


                    - The `type` field is always `"image_url"`

                    - The `image_url` field name remains unchanged

                    - The only thing that changes is the `url` value, which
                    points to the corresponding image address


                    For example: `{ type: 'image_url', image_url: { url: '...' }
                    }` structure.
                  items:
                    $ref: '#/components/schemas/Message'
                  minItems: 1
                tools:
                  type: array
                  description: >-
                    An optional array of tools the model may call. Supports Web
                    Search: `{"type": "function", "function": {"name":
                    "web_search"}}` - Enables real-time information retrieval
                    via Web Search.
                  items:
                    $ref: '#/components/schemas/Tool'
                  minItems: 0
                reasoning_effort:
                  type: string
                  enum:
                    - low
                    - high
                  description: >-
                    The effort level for the model to use for reasoning. Low
                    effort is faster to respond, high effort is slower to
                    respond but solves more complex problems. Default is "high".
                  default: high
              required:
                - messages
              x-apidog-orders:
                - messages
                - tools
                - reasoning_effort
              examples:
                - messages:
                    - role: user
                      content:
                        - type: text
                          text: What is in this image?
                        - type: image_url
                          image_url:
                            url: >-
                              https://file.aiquickdraw.com/custom-page/akr/section-images/1759055072437dqlsclj2.png
                  tools:
                    - type: function
                      function:
                        name: web_search
                  reasoning_effort: high
              x-apidog-ignore-properties: []
            example:
              messages:
                - role: user
                  content:
                    - type: text
                      text: What is in this image?
                    - type: image_url
                      image_url:
                        url: >-
                          https://file.aiquickdraw.com/custom-page/akr/section-images/1759055072437dqlsclj2.png
              tools:
                - type: function
                  function:
                    name: web_search
              reasoning_effort: high
      responses:
        '200':
          description: Request successful. Returns the standard chat completion format.
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    description: Unique identifier for the chat completion
                    examples:
                      - chatcmpl-example-123
                  object:
                    type: string
                    description: Object type
                    examples:
                      - chat.completion
                  created:
                    type: integer
                    format: int64
                    description: Unix timestamp of when the completion was created
                    examples:
                      - 1677652288
                  model:
                    type: string
                    description: Model name
                    examples:
                      - gpt-5-2
                  choices:
                    type: array
                    description: Array of completion choices
                    items:
                      type: object
                      properties:
                        index:
                          type: integer
                          description: Index of the choice
                          examples:
                            - 0
                        message:
                          type: object
                          properties:
                            role:
                              type: string
                              examples:
                                - assistant
                            content:
                              type: string
                              description: Message content
                          required:
                            - role
                            - content
                          x-apidog-orders:
                            - role
                            - content
                          x-apidog-ignore-properties: []
                        finish_reason:
                          type: string
                          description: Reason why the completion finished
                          examples:
                            - stop
                      required:
                        - index
                        - message
                        - finish_reason
                      x-apidog-orders:
                        - index
                        - message
                        - finish_reason
                      x-apidog-ignore-properties: []
                  usage:
                    type: object
                    properties:
                      prompt_tokens:
                        type: integer
                        description: Number of tokens in the prompt
                        examples:
                          - 10
                      completion_tokens:
                        type: integer
                        description: Number of tokens in the completion
                        examples:
                          - 50
                      total_tokens:
                        type: integer
                        description: Total number of tokens
                        examples:
                          - 60
                    required:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                    x-apidog-orders:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                    x-apidog-ignore-properties: []
                x-apidog-orders:
                  - id
                  - object
                  - created
                  - model
                  - choices
                  - usage
                x-apidog-ignore-properties: []
          headers: {}
          x-apidog-name: ''
        '400':
          description: Bad Request - Invalid request parameters
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: object
                    properties:
                      message:
                        type: string
                        examples:
                          - Invalid request parameters
                      type:
                        type: string
                        examples:
                          - invalid_request_error
                    x-apidog-orders:
                      - message
                      - type
                    x-apidog-ignore-properties: []
                x-apidog-orders:
                  - error
                x-apidog-ignore-properties: []
          headers: {}
          x-apidog-name: ''
        '401':
          description: Unauthorized - Invalid or missing API key
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: object
                    properties:
                      message:
                        type: string
                        examples:
                          - Unauthorized
                      type:
                        type: string
                        examples:
                          - authentication_error
                    x-apidog-orders:
                      - message
                      - type
                    x-apidog-ignore-properties: []
                x-apidog-orders:
                  - error
                x-apidog-ignore-properties: []
          headers: {}
          x-apidog-name: ''
        '429':
          description: Rate Limited - Too many requests
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: object
                    properties:
                      message:
                        type: string
                        examples:
                          - Rate limit exceeded
                      type:
                        type: string
                        examples:
                          - rate_limit_error
                    x-apidog-orders:
                      - message
                      - type
                    x-apidog-ignore-properties: []
                x-apidog-orders:
                  - error
                x-apidog-ignore-properties: []
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
      x-apidog-folder: docs/en/Market/Chat  Models/GPT
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-28563419-run
components:
  schemas:
    Tool:
      type: object
      description: >-
        Tool definition.


        - **Enhanced Network Access**: `{"type": "function", "function":
        {"name": "googleSearch"}}`
      properties:
        type:
          type: string
          enum:
            - function
          description: Utility type. Must be 'function'.
          examples:
            - function
        function:
          type: object
          description: Function declarations for enhanced network access.
          properties:
            name:
              type: string
              description: Function name. Must be `googleSearch`.
            description:
              type: string
              description: >-
                Optional but recommended. A clear and specific description of
                the function's purpose. Helps the model understand when to call
                this function.
            parameters:
              type: object
              description: >-
                Defines a JSON Schema object for function parameters. Required
                for custom functions; not used by 'googleSearch'. Follows the
                JSON Schema specification.
              properties:
                type:
                  type: string
                  enum:
                    - object
                  description: Must be 'object' for function parameters
                properties:
                  type: object
                  description: Map parameter names to objects defined in their JSON Schema.
                  additionalProperties:
                    type: string
                  x-apidog-orders: []
                  properties: {}
                  x-apidog-ignore-properties: []
                required:
                  type: array
                  items:
                    type: string
                  description: Required parameter name array
              required:
                - type
                - properties
              x-apidog-orders:
                - type
                - properties
                - required
              x-apidog-ignore-properties: []
          required:
            - name
          x-apidog-orders:
            - name
            - description
            - parameters
          x-apidog-ignore-properties: []
      required:
        - type
        - function
      x-apidog-orders:
        - type
        - function
      title: The tools parameter of the chat model
      x-apidog-ignore-properties: []
      x-apidog-folder: ''
    Message:
      type: object
      properties:
        role:
          type: string
          enum:
            - developer
            - system
            - user
            - assistant
            - tool
          description: >-
            Message role


            - **developer**: Developer-provided instructions that the model
            should follow, regardless of user messages. In o1 models and newer
            versions, developer messages replace the previous system messages.

            - **system**: Developer-provided instructions that the model should
            follow, regardless of user messages. In o1 models and newer
            versions, please use developer messages instead.

            - **user**: Messages sent by end users, containing prompts or
            additional context information.

            - **assistant**: Messages sent by the model in response to user
            messages.

            - **tool**: Content of tool messages.
        content:
          type: array
          description: >-
            Message content array that can contain text and image objects.


            **Unified Media File Format:**


            Whether it's images, videos, audio, or other document types, all
            media files use the same format structure:


            - The `type` field is always `"image_url"`

            - The `image_url` field name remains unchanged

            - The only thing that changes is the `url` value, which points to
            the corresponding media file address


            For example: images, videos, audio, PDFs, and other documents all
            use the same `{ type: 'image_url', image_url: { url: '...' } }`
            structure.
          items:
            oneOf:
              - type: object
                properties:
                  type:
                    type: string
                    enum:
                      - text
                    examples:
                      - text
                  text:
                    type: string
                    description: 消息的文本内容
                required:
                  - type
                  - text
                x-apidog-orders:
                  - type
                  - text
                x-apidog-ignore-properties: []
              - type: object
                properties:
                  type:
                    type: string
                    enum:
                      - image_url
                    examples:
                      - image_url
                  image_url:
                    type: object
                    properties:
                      url:
                        type: string
                        format: uri
                        description: 图像的 URL
                    required:
                      - url
                    x-apidog-orders:
                      - url
                    x-apidog-ignore-properties: []
                required:
                  - type
                  - image_url
                x-apidog-orders:
                  - type
                  - image_url
                x-apidog-ignore-properties: []
      required:
        - role
        - content
      title: The messages parameter of the chat model
      x-apidog-orders:
        - role
        - content
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
