# Volcengine video to video lip sync

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
      summary: Volcengine video to video lip sync
      deprecated: false
      description: >-
        ## Create Task


        Use this endpoint to create a new video-to-video lip sync task. Upload a
        video and an audio file, and the model will drive the video lip
        movements to match the target audio.


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


        ## Output Specifications


        The generated video is returned in MP4 format at 25 fps. The final
        output duration follows the audio duration: if the source video is
        longer than the audio, it will be trimmed; if the source video is
        shorter than the audio, it will be looped.


        ## Related Resources


        <CardGroup cols={2}>
          <Card title="Model Marketplace" icon="lucide-store" href="/market/quickstart">
            Explore all available models and capabilities
          </Card>
          <Card title="Common API" icon="lucide-cog" href="/common-api/get-account-credits">
            Check account credits and usage
          </Card>
        </CardGroup>
      operationId: volcengine-video-to-video-lip-sync
      tags:
        - docs/en/Market/Video Models/Volcengine
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
                    - volcengine/video-to-video-lip-sync
                  default: volcengine/video-to-video-lip-sync
                  description: >-
                    The model name used for video lip sync. This field is
                    required.


                    - This endpoint must use the
                    `volcengine/video-to-video-lip-sync` model
                  examples:
                    - volcengine/video-to-video-lip-sync
                input:
                  type: object
                  description: Input parameters for the video-to-video lip sync task.
                  required:
                    - mode
                    - video_url
                    - audio_url
                  properties:
                    mode:
                      type: string
                      enum:
                        - lite
                        - basic
                      description: >-
                        Service mode for lip-sync generation.

                        - `lite`: For single-person frontal videos. Faster
                        processing.

                        - `basic`: For single-person complex scenes. Supports
                        scene segmentation and speaker identification.
                    video_url:
                      type: string
                      format: uri
                      description: >-
                        Video URL. Supported resolution: 360p–1080p. Videos
                        above 1080p will be compressed to 1080p, while videos
                        below 360p are not supported. Supported formats: MOV,
                        MP4, HDR. Recommended codec: H.264. Other formats/codecs
                        may be transcoded. Max file size: 500 MB. Bitrate: 1–30
                        Mbps. Frame rate: 24–60 fps.
                    audio_url:
                      type: string
                      format: uri
                      description: >-
                        Target pure vocal audio URL; used to drive video lip
                        movements. Accepted file types: audio/mpeg, audio/wav,
                        audio/x-wav, audio/aac, audio/mp4, audio/ogg. Max file
                        size: 10MB.
                    separate_vocal:
                      type: boolean
                      default: false
                      description: >-
                        Enable vocal separation to suppress background noise.
                        Default value: `false`.
                    open_scenedet:
                      type: boolean
                      default: false
                      description: >-
                        Whether to enable scene segmentation and speaker
                        identification. Supported only in Basic mode. Default
                        value: `false`.
                    align_audio:
                      type: boolean
                      default: true
                      description: >-
                        Supported in Lite mode. Whether to loop the video when
                        the audio is longer than the video. Default value:
                        `true`.
                    align_audio_reverse:
                      type: boolean
                      default: false
                      description: >-
                        Supported in Lite mode. Whether to loop the video in
                        reverse (backward). Requires `align_audio` to be set to
                        `true`. Default value: `false`.
                    templ_start_seconds:
                      type: number
                      default: 0
                      description: >-
                        Supported in Lite mode. Start time of the template
                        video, in seconds. Default value: `0`.
                  x-apidog-orders:
                    - mode
                    - video_url
                    - audio_url
                    - separate_vocal
                    - open_scenedet
                    - align_audio
                    - align_audio_reverse
                    - templ_start_seconds
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
              model: volcengine/video-to-video-lip-sync
              input:
                mode: lite
                video_url: https://your-domain.com/video/example.mp4
                audio_url: https://your-domain.com/audio/speech.mp3
                separate_vocal: false
                open_scenedet: false
                align_audio: true
                align_audio_reverse: false
                templ_start_seconds: 0
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
                                task_volcengine-video-to-video-lip-sync_1234567890
                        x-apidog-orders:
                          - taskId
                    x-apidog-orders:
                      - data
              example:
                code: 200
                msg: success
                data:
                  taskId: task_volcengine-video-to-video-lip-sync_1234567890
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
      x-apidog-folder: docs/en/Market/Video Models/Volcengine
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-37880495-run
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
