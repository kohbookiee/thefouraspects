# 사면관상체 / The Four Aspects

브라우저에서 돌아가는 인터랙티브 3D 웹 페이지입니다. 설치 없이 로컬 서버만 켜면 됩니다.

## 실행 방법

프로젝트 폴더에서:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

그다음 브라우저에서 [http://127.0.0.1:8765/](http://127.0.0.1:8765/) 를 엽니다.

`index.html`을 더블클릭해서 열면 이미지가 안 뜰 수 있습니다. 반드시 위처럼 서버로 열어 주세요.

Three.js와 Noto Sans KR은 인터넷에서 불러옵니다.

## 폴더 구성

```
index.html
app.js
styles.css
favicon.ico
fonts/          제목에 쓰는 폰트
img/lite/       큐브 얼굴 텍스처
```
