# elevenlabs/text-to-dialogue-v3

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
      summary: elevenlabs/text-to-dialogue-v3
      deprecated: false
      description: >-
        Dialogue text-to-speech generation using elevenlabs/text-to-dialogue-v3


        ## Query Task Status


        After submitting a task, use the unified query endpoint to check
        progress and retrieve results:


        <Card title="Get Task Details" icon="lucide-search"
        href="/market/common/get-task-detail">
          Learn how to query task status and retrieve generation results
        </Card>


        ::: tip[]

        For production use, we recommend using the `callBackUrl` parameter to
        receive automatic notifications when generation completes, rather than
        polling the status endpoint.

        :::


        ## Related Resources


        <CardGroup cols={3}>
          <Card title="Market Overview" icon="lucide-store" href="/market/quickstart">
            Explore all available models
          </Card>
          <Card title="File Upload API" icon="lucide-cog" href="/file-upload-api/quickstart">
            Learn how to upload and manage files
          </Card>
          <Card title="Common API" icon="lucide-webhook" href="/common-api/get-account-credits">
            Check credits and account usage
          </Card>
        </CardGroup>
      operationId: elevenlabs-text-to-dialogue-v3
      tags:
        - docs/en/Market/Music Models/ElevenLabs
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
                    - elevenlabs/text-to-dialogue-v3
                  default: elevenlabs/text-to-dialogue-v3
                  description: |-
                    The model name to use for generation. Required field.

                    - Must be `elevenlabs/text-to-dialogue-v3` for this endpoint
                  examples:
                    - elevenlabs/text-to-dialogue-v3
                callBackUrl:
                  type: string
                  format: uri
                  description: >-
                    The URL to receive generation task completion updates.
                    Optional but recommended for production use.


                    - System will POST task status and results to this URL when
                    generation completes

                    - Callback includes generated content URLs and task
                    information

                    - Your callback endpoint should accept POST requests with
                    JSON payload containing results

                    - Alternatively, use the Get Task Details endpoint to poll
                    task status

                    - To ensure callback security, see [Webhook Verification
                    Guide](/common-api/webhook-verification) for signature
                    verification implementation
                  examples:
                    - https://your-domain.com/api/callback
                input:
                  type: object
                  description: Input parameters for the generation task
                  required:
                    - dialogue
                  properties:
                    dialogue:
                      type: array
                      description: >-
                        Array of dialogue items. Each item contains text and
                        voice. The total character count of all text fields
                        combined must not exceed 5000 characters.
                      items:
                        type: object
                        required:
                          - text
                          - voice
                        properties:
                          text:
                            type: string
                            description: >-
                              The dialogue text content. All text fields in the
                              dialogue array combined must not exceed 5000
                              characters.
                            examples:
                              - I have a pen, I have an apple, ah, Apple pen~
                          voice:
                            type: string
                            description: >-
                              The voice to use for speech generation. Can be a
                              preset voice name (e.g. Rachel, Adam) or a voice
                              ID. You can preview a voice by opening
                              https://static.aiquickdraw.com/elevenlabs/voice/<voice_id>.mp3
                              in your browser (replace <voice_id> with the
                              actual voice ID). For example:
                              https://static.aiquickdraw.com/elevenlabs/voice/N2lVS1w4EtoT3dr4eOWO.mp3


                              Available voices:


                              EkK5I93UQWFDigLMpZcX - James - Husky, Engaging and
                              Bold

                              Z3R5wn05IrDiVCyEkUrK - Arabella - Mysterious and
                              Emotive

                              NNl6r8mD7vthiJatiJt1 - Bradford - Expressive and
                              Articulate

                              YOq2y2Up4RgXP2HyXjE5 - Xavier - Dominating,
                              Metallic Announcer

                              B8gJV1IhpuegLxdpXFOE - Kuon - Cheerful, Clear and
                              Steady

                              2zRM7PkgwBPiau2jvVXc - Monika Sogam - Deep and
                              Natural

                              1SM7GgM6IMuvQlz2BwM3 - Mark - Casual, Relaxed and
                              Light

                              5l5f8iK3YPeGga21rQIX - Adeline - Feminine and
                              Conversational

                              scOwDtmlUjD3prqpp97I - Sam - Support Agent

                              NOpBlnGInO9m6vDvFkFC - Spuds Oxley - Wise and
                              Approachable

                              BZgkqPqms7Kj9ulSkVzn - Eve - Authentic, Energetic
                              and Happy

                              wo6udizrrtpIxWGp2qJk - Northern Terry

                              gU0LNdkMOQCOrPrwtbee - British Football Announcer

                              DGzg6RaUqxGRTHSBjfgF - Brock - Commanding and Loud
                              Sergeant

                              x70vRnQBMBu4FAYhjJbO - Nathan - Virtual Radio Host

                              Sm1seazb4gs7RSlUVw7c - Anika - Animated, Friendly
                              and Engaging

                              P1bg08DkjqiVEzOn76yG - Viraj - Rich and Soft

                              qDuRKMlYmrm8trt5QyBn - Taksh - Calm, Serious and
                              Smooth

                              qXpMhyvQqiRxWQs4qSSB - Horatius - Energetic
                              Character Voice

                              TX3LPaxmHKxFdv7VOQHJ - Liam - Energetic, Social
                              Media Creator

                              N2lVS1w4EtoT3dr4eOWO - Callum - Husky Trickster

                              FGY2WhTYpPnrIDTdsKH5 - Laura - Enthusiast, Quirky
                              Attitude

                              kPzsL2i3teMYv0FxEYQ6 - Brittney - Social Media
                              Voice - Fun, Youthful & Informative

                              UgBBYS2sOqTuMpoF3BR0 - Mark - Natural
                              Conversations

                              hpp4J3VqNfWAUOO0d1Us - Bella - Professional,
                              Bright, Warm

                              nPczCjzI2devNBz1zQrb - Brian - Deep, Resonant and
                              Comforting

                              uYXf8XasLslADfZ2MB4u - Hope - Bubbly, Gossipy and
                              Girly

                              gs0tAILXbY5DNrJrsM6F - Jeff - Classy, Resonating
                              and Strong

                              DTKMou8ccj1ZaWGBiotd - Jamahal - Young, Vibrant,
                              and Natural

                              vBKc2FfBKJfcZNyEt1n6 - Finn - Youthful, Eager and
                              Energetic

                              DYkrAHD8iwork3YSUBbs - Tom - Conversations & Books

                              56AoDkrOh6qfVPDXZ7Pt - Cassidy - Crisp, Direct and
                              Clear

                              eR40ATw9ArzDf9h3v7t7 - Addison 2.0 - Australian
                              Audiobook & Podcast

                              g6xIsTj2HwM6VR4iXFCw - Jessica Anne Bogart -
                              Chatty and Friendly

                              lcMyyd2HUfFzxdCaC4Ta - Lucy - Fresh & Casual

                              6aDn1KB0hjpdcocrUkmq - Tiffany - Natural and
                              Welcoming

                              Sq93GQT4X1lKDXsQcixO - Felix - Warm, Positive &
                              Contemporary RP

                              flHkNRp1BlvT73UL6gyz - Jessica Anne Bogart -
                              Eloquent Villain

                              9yzdeviXkFddZ4Oz8Mok - Lutz - Chuckling, Giggly
                              and Cheerful

                              pPdl9cQBQq4p6mRkZy2Z - Emma - Adorable and Upbeat

                              zYcjlYFOd3taleS0gkk3 - Edward - Loud, Confident
                              and Cocky

                              nzeAacJi50IvxcyDnMXa - Marshal - Friendly, Funny
                              Professor

                              ruirxsoakN0GWmGNIo04 - John Morgan - Gritty,
                              Rugged Cowboy

                              TC0Zp7WVFzhA8zpTlRqV - Aria - Sultry Villain

                              ljo9gAlSqKOvF6D8sOsX - Viking Bjorn - Epic
                              Medieval Raider

                              PPzYpIqttlTYA83688JI - Pirate Marshal

                              8JVbfL6oEdmuxKn5DK2C - Johnny Kid - Serious and
                              Calm Narrator

                              iCrDUkL56s3C8sCRl7wb - Hope - Poetic, Romantic and
                              Captivating

                              wJqPPQ618aTW29mptyoc - Ana Rita - Smooth,
                              Expressive and Bright

                              EiNlNiXeDU1pqqOPrYMO - John Doe - Deep

                              4YYIPFl9wE5c4L2eu2Gb - Burt Reynolds™ - Deep,
                              Smooth and Clear

                              6F5Zhi321D3Oq7v1oNT4 - Hank - Deep and Engaging
                              Narrator

                              YXpFCvM1S3JbWEJhoskW - Wyatt - Wise Rustic Cowboy

                              LG95yZDEHg6fCZdQjLqj - Phil - Explosive,
                              Passionate Announcer

                              CeNX9CMwmxDxUF5Q2Inm - Johnny Dynamite - Vintage
                              Radio DJ

                              aD6riP1btT197c6dACmy - Rachel M - Pro British
                              Radio Presenter

                              mtrellq69YZsNwzUSyXh - Rex Thunder - Deep N Tough

                              dHd5gvgSOzSfduK4CvEg - Ed - Late Night Announcer

                              eVItLK1UvXctxuaRV2Oq - Jean - Alluring and Playful
                              Femme Fatale

                              esy0r39YPLQjOczyOib8 - Britney - Calm and
                              Calculative Villain

                              Tsns2HvNFKfGiNjllgqo - Sven - Emotional and Nice

                              1U02n4nD6AdIZ9CjF053 - Viraj - Smooth and Gentle

                              AeRdCCKzvd23BpJoofzx - Nathaniel - Engaging,
                              British and Calm

                              LruHrtVF6PSyGItzMNHS - Benjamin - Deep, Warm,
                              Calming

                              1wGbFxmAM3Fgw63G1zZJ - Allison - Calm, Soothing
                              and Meditative

                              hqfrgApggtO1785R4Fsn - Theodore HQ - Serene and
                              Grounded

                              MJ0RnG71ty4LH3dvNfSd - Leon - Soothing and
                              Grounded
                            enum:
                              - EkK5I93UQWFDigLMpZcX
                              - Z3R5wn05IrDiVCyEkUrK
                              - NNl6r8mD7vthiJatiJt1
                              - YOq2y2Up4RgXP2HyXjE5
                              - B8gJV1IhpuegLxdpXFOE
                              - 2zRM7PkgwBPiau2jvVXc
                              - 1SM7GgM6IMuvQlz2BwM3
                              - 5l5f8iK3YPeGga21rQIX
                              - scOwDtmlUjD3prqpp97I
                              - NOpBlnGInO9m6vDvFkFC
                              - BZgkqPqms7Kj9ulSkVzn
                              - wo6udizrrtpIxWGp2qJk
                              - gU0LNdkMOQCOrPrwtbee
                              - DGzg6RaUqxGRTHSBjfgF
                              - x70vRnQBMBu4FAYhjJbO
                              - Sm1seazb4gs7RSlUVw7c
                              - P1bg08DkjqiVEzOn76yG
                              - qDuRKMlYmrm8trt5QyBn
                              - qXpMhyvQqiRxWQs4qSSB
                              - TX3LPaxmHKxFdv7VOQHJ
                              - N2lVS1w4EtoT3dr4eOWO
                              - FGY2WhTYpPnrIDTdsKH5
                              - kPzsL2i3teMYv0FxEYQ6
                              - UgBBYS2sOqTuMpoF3BR0
                              - hpp4J3VqNfWAUOO0d1Us
                              - nPczCjzI2devNBz1zQrb
                              - uYXf8XasLslADfZ2MB4u
                              - gs0tAILXbY5DNrJrsM6F
                              - DTKMou8ccj1ZaWGBiotd
                              - vBKc2FfBKJfcZNyEt1n6
                              - DYkrAHD8iwork3YSUBbs
                              - 56AoDkrOh6qfVPDXZ7Pt
                              - eR40ATw9ArzDf9h3v7t7
                              - g6xIsTj2HwM6VR4iXFCw
                              - lcMyyd2HUfFzxdCaC4Ta
                              - 6aDn1KB0hjpdcocrUkmq
                              - Sq93GQT4X1lKDXsQcixO
                              - flHkNRp1BlvT73UL6gyz
                              - 9yzdeviXkFddZ4Oz8Mok
                              - pPdl9cQBQq4p6mRkZy2Z
                              - zYcjlYFOd3taleS0gkk3
                              - nzeAacJi50IvxcyDnMXa
                              - ruirxsoakN0GWmGNIo04
                              - TC0Zp7WVFzhA8zpTlRqV
                              - ljo9gAlSqKOvF6D8sOsX
                              - PPzYpIqttlTYA83688JI
                              - 8JVbfL6oEdmuxKn5DK2C
                              - iCrDUkL56s3C8sCRl7wb
                              - wJqPPQ618aTW29mptyoc
                              - EiNlNiXeDU1pqqOPrYMO
                              - 4YYIPFl9wE5c4L2eu2Gb
                              - 6F5Zhi321D3Oq7v1oNT4
                              - YXpFCvM1S3JbWEJhoskW
                              - LG95yZDEHg6fCZdQjLqj
                              - CeNX9CMwmxDxUF5Q2Inm
                              - aD6riP1btT197c6dACmy
                              - mtrellq69YZsNwzUSyXh
                              - dHd5gvgSOzSfduK4CvEg
                              - eVItLK1UvXctxuaRV2Oq
                              - esy0r39YPLQjOczyOib8
                              - Tsns2HvNFKfGiNjllgqo
                              - 1U02n4nD6AdIZ9CjF053
                              - AeRdCCKzvd23BpJoofzx
                              - LruHrtVF6PSyGItzMNHS
                              - 1wGbFxmAM3Fgw63G1zZJ
                              - hqfrgApggtO1785R4Fsn
                              - MJ0RnG71ty4LH3dvNfSd
                            default: EkK5I93UQWFDigLMpZcX
                            x-apidog-enum:
                              - value: EkK5I93UQWFDigLMpZcX
                                name: ''
                                description: ''
                              - value: Z3R5wn05IrDiVCyEkUrK
                                name: ''
                                description: ''
                              - value: NNl6r8mD7vthiJatiJt1
                                name: ''
                                description: ''
                              - value: YOq2y2Up4RgXP2HyXjE5
                                name: ''
                                description: ''
                              - value: B8gJV1IhpuegLxdpXFOE
                                name: ''
                                description: ''
                              - value: 2zRM7PkgwBPiau2jvVXc
                                name: ''
                                description: ''
                              - value: 1SM7GgM6IMuvQlz2BwM3
                                name: ''
                                description: ''
                              - value: 5l5f8iK3YPeGga21rQIX
                                name: ''
                                description: ''
                              - value: scOwDtmlUjD3prqpp97I
                                name: ''
                                description: ''
                              - value: NOpBlnGInO9m6vDvFkFC
                                name: ''
                                description: ''
                              - value: BZgkqPqms7Kj9ulSkVzn
                                name: ''
                                description: ''
                              - value: wo6udizrrtpIxWGp2qJk
                                name: ''
                                description: ''
                              - value: gU0LNdkMOQCOrPrwtbee
                                name: ''
                                description: ''
                              - value: DGzg6RaUqxGRTHSBjfgF
                                name: ''
                                description: ''
                              - value: x70vRnQBMBu4FAYhjJbO
                                name: ''
                                description: ''
                              - value: Sm1seazb4gs7RSlUVw7c
                                name: ''
                                description: ''
                              - value: P1bg08DkjqiVEzOn76yG
                                name: ''
                                description: ''
                              - value: qDuRKMlYmrm8trt5QyBn
                                name: ''
                                description: ''
                              - value: qXpMhyvQqiRxWQs4qSSB
                                name: ''
                                description: ''
                              - value: TX3LPaxmHKxFdv7VOQHJ
                                name: ''
                                description: ''
                              - value: N2lVS1w4EtoT3dr4eOWO
                                name: ''
                                description: ''
                              - value: FGY2WhTYpPnrIDTdsKH5
                                name: ''
                                description: ''
                              - value: kPzsL2i3teMYv0FxEYQ6
                                name: ''
                                description: ''
                              - value: UgBBYS2sOqTuMpoF3BR0
                                name: ''
                                description: ''
                              - value: hpp4J3VqNfWAUOO0d1Us
                                name: ''
                                description: ''
                              - value: nPczCjzI2devNBz1zQrb
                                name: ''
                                description: ''
                              - value: uYXf8XasLslADfZ2MB4u
                                name: ''
                                description: ''
                              - value: gs0tAILXbY5DNrJrsM6F
                                name: ''
                                description: ''
                              - value: DTKMou8ccj1ZaWGBiotd
                                name: ''
                                description: ''
                              - value: vBKc2FfBKJfcZNyEt1n6
                                name: ''
                                description: ''
                              - value: DYkrAHD8iwork3YSUBbs
                                name: ''
                                description: ''
                              - value: 56AoDkrOh6qfVPDXZ7Pt
                                name: ''
                                description: ''
                              - value: eR40ATw9ArzDf9h3v7t7
                                name: ''
                                description: ''
                              - value: g6xIsTj2HwM6VR4iXFCw
                                name: ''
                                description: ''
                              - value: lcMyyd2HUfFzxdCaC4Ta
                                name: ''
                                description: ''
                              - value: 6aDn1KB0hjpdcocrUkmq
                                name: ''
                                description: ''
                              - value: Sq93GQT4X1lKDXsQcixO
                                name: ''
                                description: ''
                              - value: flHkNRp1BlvT73UL6gyz
                                name: ''
                                description: ''
                              - value: 9yzdeviXkFddZ4Oz8Mok
                                name: ''
                                description: ''
                              - value: pPdl9cQBQq4p6mRkZy2Z
                                name: ''
                                description: ''
                              - value: zYcjlYFOd3taleS0gkk3
                                name: ''
                                description: ''
                              - value: nzeAacJi50IvxcyDnMXa
                                name: ''
                                description: ''
                              - value: ruirxsoakN0GWmGNIo04
                                name: ''
                                description: ''
                              - value: TC0Zp7WVFzhA8zpTlRqV
                                name: ''
                                description: ''
                              - value: ljo9gAlSqKOvF6D8sOsX
                                name: ''
                                description: ''
                              - value: PPzYpIqttlTYA83688JI
                                name: ''
                                description: ''
                              - value: 8JVbfL6oEdmuxKn5DK2C
                                name: ''
                                description: ''
                              - value: iCrDUkL56s3C8sCRl7wb
                                name: ''
                                description: ''
                              - value: wJqPPQ618aTW29mptyoc
                                name: ''
                                description: ''
                              - value: EiNlNiXeDU1pqqOPrYMO
                                name: ''
                                description: ''
                              - value: 4YYIPFl9wE5c4L2eu2Gb
                                name: ''
                                description: ''
                              - value: 6F5Zhi321D3Oq7v1oNT4
                                name: ''
                                description: ''
                              - value: YXpFCvM1S3JbWEJhoskW
                                name: ''
                                description: ''
                              - value: LG95yZDEHg6fCZdQjLqj
                                name: ''
                                description: ''
                              - value: CeNX9CMwmxDxUF5Q2Inm
                                name: ''
                                description: ''
                              - value: aD6riP1btT197c6dACmy
                                name: ''
                                description: ''
                              - value: mtrellq69YZsNwzUSyXh
                                name: ''
                                description: ''
                              - value: dHd5gvgSOzSfduK4CvEg
                                name: ''
                                description: ''
                              - value: eVItLK1UvXctxuaRV2Oq
                                name: ''
                                description: ''
                              - value: esy0r39YPLQjOczyOib8
                                name: ''
                                description: ''
                              - value: Tsns2HvNFKfGiNjllgqo
                                name: ''
                                description: ''
                              - value: 1U02n4nD6AdIZ9CjF053
                                name: ''
                                description: ''
                              - value: AeRdCCKzvd23BpJoofzx
                                name: ''
                                description: ''
                              - value: LruHrtVF6PSyGItzMNHS
                                name: ''
                                description: ''
                              - value: 1wGbFxmAM3Fgw63G1zZJ
                                name: ''
                                description: ''
                              - value: hqfrgApggtO1785R4Fsn
                                name: ''
                                description: ''
                              - value: MJ0RnG71ty4LH3dvNfSd
                                name: ''
                                description: ''
                            examples:
                              - EkK5I93UQWFDigLMpZcX
                        x-apidog-orders:
                          - text
                          - voice
                        x-apidog-ignore-properties: []
                      examples:
                        - - text: I have a pen, I have an apple, ah, Apple pen~
                            voice: Adam
                          - text: a happy dog
                            voice: Brian
                          - text: a happy cat
                            voice: Roger
                    stability:
                      type: number
                      description: >-
                        Voice stability parameter. Must be one of the following
                        values: 0.0, 0.5, or 1.0
                      enum:
                        - 0
                        - 0.5
                        - 1
                      default: 0.5
                      examples:
                        - 0.5
                    language_code:
                      type: string
                      description: >-
                        Language code for the speech. Default is empty string or
                        omit the parameter for automatic language detection.
                      enum:
                        - af
                        - ar
                        - hy
                        - as
                        - az
                        - be
                        - bn
                        - bs
                        - bg
                        - ca
                        - ceb
                        - ny
                        - hr
                        - cs
                        - da
                        - nl
                        - en
                        - et
                        - fil
                        - fi
                        - fr
                        - gl
                        - ka
                        - de
                        - el
                        - gu
                        - ha
                        - he
                        - hi
                        - hu
                        - is
                        - id
                        - ga
                        - it
                        - ja
                        - jv
                        - kn
                        - kk
                        - ky
                        - ko
                        - lv
                        - ln
                        - lt
                        - lb
                        - mk
                        - ms
                        - ml
                        - zh
                        - mr
                        - ne
                        - 'no'
                        - ps
                        - fa
                        - pl
                        - pt
                        - pa
                        - ro
                        - ru
                        - sr
                        - sd
                        - sk
                        - sl
                        - so
                        - es
                        - sw
                        - sv
                        - ta
                        - te
                        - th
                        - tr
                        - uk
                        - ur
                        - vi
                        - cy
                  x-apidog-orders:
                    - dialogue
                    - stability
                    - language_code
                  x-apidog-ignore-properties: []
              x-apidog-orders:
                - model
                - callBackUrl
                - input
              x-apidog-ignore-properties: []
            example:
              model: elevenlabs/text-to-dialogue-v3
              callBackUrl: https://your-domain.com/api/callback
              input:
                dialogue:
                  - text: I have a pen, I have an apple, ah, Apple pen~
                    voice: EkK5I93UQWFDigLMpZcX
                  - text: a happy dog
                    voice: Z3R5wn05IrDiVCyEkUrK
                  - text: a happy cat
                    voice: NNl6r8mD7vthiJatiJt1
                stability: 0.5
      responses:
        '200':
          description: Request successful
          content:
            application/json:
              schema:
                allOf:
                  - type: object
                    x-apidog-refs:
                      01KFWZ7J7MTQPJWXJ40M5Z2YEM:
                        $ref: '#/components/schemas/ApiResponseWithRecordId'
                    x-apidog-orders:
                      - 01KFWZ7J7MTQPJWXJ40M5Z2YEM
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
                              Task ID, can be used with Get Task Details
                              endpoint to query task status
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
              example:
                code: 200
                msg: success
                data:
                  taskId: task_elevenlabs_1765185448724
                  recordId: elevenlabs_1765185448724
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
          x-apidog-name: 'Error '
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
      x-apidog-folder: docs/en/Market/Music Models/ElevenLabs
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1184766/apis/api-28506430-run
components:
  schemas:
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
