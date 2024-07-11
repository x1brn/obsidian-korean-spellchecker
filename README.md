# Obsidian Korean Spellchecker

> [!WARNING]
> 이 플러그인은 현재 베타 버전입니다. 언제든 수정될 수 있습니다.

## 서비스 제공자 요청에 따른 고지사항

> [!WARNING]
>
> - [한국어 맞춤법/문법 검사기](http://nara-speller.co.kr/speller/)는 부산대학교 인공지능연구실과 (주)나라인포테크가 함께 만들고 있습니다.
> - 이 검사기는 개인이나 학생만 무료로 사용할 수 있습니다.
> - 본 플러그인은 [한국어 맞춤법/문법 검사기](http://nara-speller.co.kr/speller/)를 활용하며, 검사 결과에 대한 모든 저작권은 [한국어 맞춤법/문법 검사기](http://nara-speller.co.kr/speller/)에 명시된 바와 같습니다.
> - 또한, 서비스 제공자의 요청에 따라 본 플러그인은 *개인*이 *비영리* 목적으로 *정상*적인 범위에서만 사용하실 수 있으며, 이를 준수하지 않는 범위에서 사용하거나, 코드를 공유하는 것을 금합니다.

## 참고 사항

> [!NOTE]
>
> - 한 번에 *300어절 이하*만 검사할 수 있습니다.
> - [한국어 맞춤법/문법 검사기](http://nara-speller.co.kr/speller/) 또는 Obsidian 앱 등의 업데이트로 언제든 정상 작동하지 않을 수 있습니다.
> - 인터넷이 연결된 상태에서만 작동합니다.
> - CORS 프록시 서버를 사용합니다. 검사를 진행한 텍스트는 검사기 또는 프록시 서버로부터 유출될 수 있습니다. *민감한 개인 정보 전송에 유의*하세요.
> - 맞춤법 결과는 항상 정확하지 않을 수 있습니다.

본 플러그인을 사용하는 것은 사용자가 위의 "서비스 제공자 요청에 따른 고지사항"과 "참고 사항"을 모두 인지하고, 동의함을 의미합니다.

## 설치

1. Obsidian 설정 - Community plugins에서 BRAT 플러그인을 설치하고 활성화 합니다.
2. BRAT 플러그인의 Options에서 `Add Beta Plugin` 버튼을 클릭합니다.
3. 대화 상자에서 Repository에 `https://github.com/x1brn/obsidian-korean-spellchecker`을 붙여 넣고 `Add Plugin` 버튼을 누릅니다.

## 사용법

1. 검사하고자 하는 텍스트를 블록 선택합니다.
2. 커맨드 팔레트(Command + P 또는 Control + P)에서 `한국어 맞춤법/문법 검사기: Check Spelling`을 선택하여 실행합니다.
3. 검사 결과 창에서 오류를 수정하고 적용합니다.
