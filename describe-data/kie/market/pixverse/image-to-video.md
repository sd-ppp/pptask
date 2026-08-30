# PixVerse V6 Image-to-Video

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
      summary: PixVerse V6 Image-to-Video
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
      operationId: pixverse-v6-image-to-video
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
                    - pixverse-v6/image-to-video
                  default: pixverse-v6/image-to-video
                  x-apidog-enum:
                    - value: pixverse-v6/image-to-video
                      name: ''
                      description: ''
                  examples:
                    - pixverse-v6/image-to-video
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
                  description: Input parameters for the image-to-video task
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
                          Cinematic sunrise illuminating a mist-shrouded
                          mountain lake, camera slowly skimming over the water,
                          a flock of birds flying across the sky
                    image_urls:
                      type: array
                      items:
                        type: string
                      description: >-
                        Image URLs, supports up to 2 images, single image size
                        not exceeding 20 MB. Supports HTTP, HTTPS, and OSS
                        addresses. Supported image formats include JPG, JPEG,
                        PNG, and WebP.
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
                        Generated video duration in seconds, ranging from 1 to
                        15. Required when template_id is not passed; if
                        template_id is passed, the video duration is fixed by
                        the selected template, please do not pass this parameter
                        at the same time.
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
                        Random seed, value range is 0-2147483647. Using the same
                        parameters and seed helps improve result
                        reproducibility.
                      minimum: 0
                      maximum: 2147483647
                      examples:
                        - 123456789
                    template_id:
                      type: string
                      description: >-
                        Used to select a PixVerse video effect template. Please
                        pass in the corresponding template_id. Once a
                        template_id is provided, the video duration is fixed by
                        the selected template, so duration cannot be set at the
                        same time. effect_type indicates the number of images
                        required by the selected template. Please upload the
                        specified number of images accordingly. To preview the
                        template effect, open
                        https://static.aiquickdraw.com/tools/example/<template_id>.mp4
                        in a browser and replace <template_id> with the actual
                        template ID. For
                        example:https://static.aiquickdraw.com/tools/example/412736208886848.mp4.


                        Available template list:


                        412736208886848 - Dive into the deep blue of love - Let
                        every kiss turn into a dream. - effect_type: 2

                        411563216524736 - Skyline Track Flag - Unwavering. Next
                        is the city-level entrance effect. - effect_type: 1

                        411316927927040 - Vibe Copines - Capture this vibe with
                        tungtung. - effect_type: 1

                        411174903569216 - Crowd Focus - First person: The camera
                        caught you - upload a selfie or group photo to become
                        the focus of the audience - effect_type: 1

                        410999246341952 - Poke my little cutie - Pinch this
                        little guy and watch it get cutely angry. - effect_type:
                        1

                        408891141511104 - Today is my birthday - Yes, I know you
                        don't know me, but today is my birthday - effect_type: 1

                        410317363057408 - Mini Football Hero - Turn any photo
                        into a mini chibi football hero and compete with giant
                        players in a cinematic hyper-realistic stadium. -
                        effect_type: 1

                        410285445698304 - Magma Rise - Rise from the ashes.
                        Fight fire with fire. - effect_type: 1

                        410133101388544 - Cyber Armor: Reborn in the Rain 🌧️⚡ -
                        Shatter the storm. Awaken the body of steel within. -
                        effect_type: 1

                        409899296377728 - Product Landmark - Upload your product
                        and turn it into a building! - effect_type: 1

                        408897485909952 - Mini Football Pitch - Upload your
                        product and create a mini football pitch inside it! -
                        effect_type: 1

                        408869061406656 - A kick through the world - Upload your
                        product and let it shine on the night of the grand
                        annual global competition! - effect_type: 1

                        408661207662528 - Small Town Footballer - Upload your
                        product and enjoy the moment of victory! - effect_type:
                        1

                        409767750265728 - Crowned God in One Battle - You
                        unexpectedly became the MVP of the game. - effect_type:
                        1

                        409766559675264 - Thriller Dance Steps - Upload a photo
                        and watch it turn into an iconic viral dance trend! -
                        effect_type: 1

                        409589071559552 - Dai Dai Dance - Vibe cheering dance
                        template. A front-facing photo to easily join the dance
                        floor clip. - effect_type: 1

                        407804339389760 - Fluffy Chef - Upload your product and
                        cook in the fluffy kitchen - effect_type: 1

                        407658863287616 - Summer Postcard - Upload your product
                        and join the summer special! - effect_type: 1

                        407474361215744 - Inhaled into Product Universe - Upload
                        your product and enter the product universe! -
                        effect_type: 1

                        407473438360320 - Fluffy Factory - Upload your product
                        to make it in the fluffy factory - effect_type: 1

                        407467702283008 - Surfing Summer - Upload your product
                        photo and start surfing! - effect_type: 1

                        385844572217469 - Love Launcher - A Valentine's Day
                        moment in one shot. - effect_type: 1

                        406428904874432 - Kitty Shop - Upload your product image
                        and let the cute cat transform into your street vendor!
                        - effect_type: 1

                        406423682060736 - Courtyard Makeover Party - Upload your
                        courtyard and give it a magical makeover! - effect_type:
                        1

                        406411724685760 - Ski Joy - Upload a photo of your pet,
                        toy or product and let it embark on a fun skiing
                        adventure. - effect_type: 1

                        406372274350528 - Nail Lab - Upload your nail photos and
                        let our exclusive manicurists create exquisite nails for
                        you. - effect_type: 1

                        406218913317312 - Rhythm Dash - Hit the beat, take off
                        the crown. Welcome to the perfect score frenzy. -
                        effect_type: 1

                        406218479198656 - Screen Killer King - The court needs a
                        hero. So, you break through the screen. - effect_type: 1

                        406064763308480 - Dynamic Football Poster - From selfie
                        to jersey photo (single and multiplayer) - effect_type:
                        1

                        406413607395776 - Football Live King! - The moment you
                        score a wonderful goal, super sports car gifts pour
                        down. - effect_type: 1

                        405662117814720 - Trophy Breakthrough - Upload your
                        photo, transform into a champion football player, break
                        through the screen and win the trophy! - effect_type: 1

                        406014934000064 - Post-match Sharp Comment - If the
                        microphone is handed to you after the game, what would
                        you say? - effect_type: 1

                        405658369331648 - Stadium Legend - Run, celebrate,
                        create a legendary football moment. - effect_type: 1

                        405321470423488 - Step by Step - Step by step, shining
                        with confidence - effect_type: 1

                        405175211454656 - Superstar Lobby - Welcome to your
                        championship season. - effect_type: 1

                        404955806201792 - Post-match Sharp Comment 2 - If it's
                        your turn for a post-match interview, what would you say
                        about this game? - effect_type: 1

                        404820147974080 - Top of the World - Hold the trophy
                        high and become the well-deserved hero of the football
                        feast. - effect_type: 2

                        398980393937856 - The Last Hug - The last hug before the
                        tsunami comes. - effect_type: 2

                        403916646846400 - My Future has Infinite Possibilities -
                        Embrace your infinite potential and shine your future. -
                        effect_type: 1

                        403739217192896 - Apex Dance - Flat rhythm, decadent
                        chaotic dance steps - effect_type: 1

                        403560060358144 - Idol Ending Shot - One look up is a
                        million direct shots. - effect_type: 1

                        403556618212098 - MotoGP Live - Live an unchoreographed
                        moment. - effect_type: 1

                        398965022284579 - Knee Slide - Celebrate the victory
                        with an iconic and energetic knee slide goal. -
                        effect_type: 1

                        402201060373270 - Tunnel to Captain - Transform from an
                        ordinary girl to a legendary football captain in a
                        cinematic stadium journey. - effect_type: 1

                        403085292466285 - Golden Field Breaker - He is not on
                        the list, but he still controls the scene. -
                        effect_type: 1

                        402061828030966 - Trophy Celebration - Have you always
                        wanted a huge trophy? Here, you can at least get it
                        digitally. - effect_type: 1

                        402888569901524 - Jump into the Crowd 2 - Jump into the
                        crowd - effect_type: 1

                        402155676592228 - World Champion Lift - You are the
                        captain, lifting the trophy of victory. Mountains of
                        people, golden ribbons, pure victory. - effect_type: 1

                        402047865383360 - Sideline Ball Boy - Experience the
                        game from a unique perspective on the sidelines. Feel
                        the excitement of the game as a young talent ready to
                        participate. - effect_type: 1

                        402046136040202 - Epic Save - Become a legendary
                        goalkeeper. Catch the ball in a stunning flying save. -
                        effect_type: 1
                      enum:
                        - '412736208886848'
                        - '411563216524736'
                        - '411316927927040'
                        - '411174903569216'
                        - '410999246341952'
                        - '408891141511104'
                        - '410317363057408'
                        - '410285445698304'
                        - '410133101388544'
                        - '409899296377728'
                        - '408897485909952'
                        - '408869061406656'
                        - '408661207662528'
                        - '409767750265728'
                        - '409766559675264'
                        - '409589071559552'
                        - '407804339389760'
                        - '407658863287616'
                        - '407474361215744'
                        - '407473438360320'
                        - '407467702283008'
                        - '385844572217469'
                        - '406428904874432'
                        - '406423682060736'
                        - '406411724685760'
                        - '406372274350528'
                        - '406218913317312'
                        - '406218479198656'
                        - '406064763308480'
                        - '406413607395776'
                        - '405662117814720'
                        - '406014934000064'
                        - '405658369331648'
                        - '405321470423488'
                        - '405175211454656'
                        - '404955806201792'
                        - '404820147974080'
                        - '398980393937856'
                        - '403916646846400'
                        - '403739217192896'
                        - '403560060358144'
                        - '403556618212098'
                        - '398965022284579'
                        - '402201060373270'
                        - '403085292466285'
                        - '402061828030966'
                        - '402888569901524'
                        - '402155676592228'
                        - '402047865383360'
                        - '402046136040202'
                      x-apidog-enum:
                        - value: '412736208886848'
                          name: ''
                          description: ''
                        - value: '411563216524736'
                          name: ''
                          description: ''
                        - value: '411316927927040'
                          name: ''
                          description: ''
                        - value: '411174903569216'
                          name: ''
                          description: ''
                        - value: '410999246341952'
                          name: ''
                          description: ''
                        - value: '408891141511104'
                          name: ''
                          description: ''
                        - value: '410317363057408'
                          name: ''
                          description: ''
                        - value: '410285445698304'
                          name: ''
                          description: ''
                        - value: '410133101388544'
                          name: ''
                          description: ''
                        - value: '409899296377728'
                          name: ''
                          description: ''
                        - value: '408897485909952'
                          name: ''
                          description: ''
                        - value: '408869061406656'
                          name: ''
                          description: ''
                        - value: '408661207662528'
                          name: ''
                          description: ''
                        - value: '409767750265728'
                          name: ''
                          description: ''
                        - value: '409766559675264'
                          name: ''
                          description: ''
                        - value: '409589071559552'
                          name: ''
                          description: ''
                        - value: '407804339389760'
                          name: ''
                          description: ''
                        - value: '407658863287616'
                          name: ''
                          description: ''
                        - value: '407474361215744'
                          name: ''
                          description: ''
                        - value: '407473438360320'
                          name: ''
                          description: ''
                        - value: '407467702283008'
                          name: ''
                          description: ''
                        - value: '385844572217469'
                          name: ''
                          description: ''
                        - value: '406428904874432'
                          name: ''
                          description: ''
                        - value: '406423682060736'
                          name: ''
                          description: ''
                        - value: '406411724685760'
                          name: ''
                          description: ''
                        - value: '406372274350528'
                          name: ''
                          description: ''
                        - value: '406218913317312'
                          name: ''
                          description: ''
                        - value: '406218479198656'
                          name: ''
                          description: ''
                        - value: '406064763308480'
                          name: ''
                          description: ''
                        - value: '406413607395776'
                          name: ''
                          description: ''
                        - value: '405662117814720'
                          name: ''
                          description: ''
                        - value: '406014934000064'
                          name: ''
                          description: ''
                        - value: '405658369331648'
                          name: ''
                          description: ''
                        - value: '405321470423488'
                          name: ''
                          description: ''
                        - value: '405175211454656'
                          name: ''
                          description: ''
                        - value: '404955806201792'
                          name: ''
                          description: ''
                        - value: '404820147974080'
                          name: ''
                          description: ''
                        - value: '398980393937856'
                          name: ''
                          description: ''
                        - value: '403916646846400'
                          name: ''
                          description: ''
                        - value: '403739217192896'
                          name: ''
                          description: ''
                        - value: '403560060358144'
                          name: ''
                          description: ''
                        - value: '403556618212098'
                          name: ''
                          description: ''
                        - value: '398965022284579'
                          name: ''
                          description: ''
                        - value: '402201060373270'
                          name: ''
                          description: ''
                        - value: '403085292466285'
                          name: ''
                          description: ''
                        - value: '402061828030966'
                          name: ''
                          description: ''
                        - value: '402888569901524'
                          name: ''
                          description: ''
                        - value: '402155676592228'
                          name: ''
                          description: ''
                        - value: '402047865383360'
                          name: ''
                          description: ''
                        - value: '402046136040202'
                          name: ''
                          description: ''
                  x-apidog-orders:
                    - prompt
                    - image_urls
                    - quality
                    - duration
                    - generate_audio_switch
                    - generate_multi_clip_switch
                    - seed
                    - template_id
                  required:
                    - prompt
                    - image_urls
                    - quality
                    - duration
                  x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: pixverse-v6/image-to-video
              input:
                prompt: Animate the subject with gentle wind and cinematic lighting
                image_urls:
                  - https://example.com/input-image.png
                duration: 5
                quality: 720p
                generate_audio_switch: false
                generate_multi_clip_switch: false
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
      x-apidog-folder: docs/en/Market/Video Models/PixVerse
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-40433690-run
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
