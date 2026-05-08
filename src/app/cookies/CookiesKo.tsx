export function CookiesKo() {
  return (
    <>
      <h1>RouYou 쿠키 정책</h1>
      <p className="text-leaf-500">최근 개정일: 2026 년 5 월 7 일 · 시행일: 공지일</p>

      <p>
        본 정책은 RouYou(이하 &quot;서비스&quot;)가 쿠키와 유사 기술(localStorage, sessionStorage, 픽셀 태그 등)을 어떻게 사용하는지 설명합니다.
        쿠키는 4 가지 카테고리로 분류되며 처음 방문 시 동의 배너 또는 설정 페이지에서 개별적으로 활성화 여부를 선택할 수 있습니다.
        <strong>&quot;필수&quot;는 로그인, 보안 등 기본 기능을 담당하기 때문에 끌 수 없습니다</strong>.
      </p>

      <h2>1. 쿠키의 4 가지 카테고리</h2>

      <h3>1.1 필수 쿠키(Strictly Necessary)</h3>
      <p>
        사이트 운영에 필수적이며, 핵심 기능(로그인, 인증, 결제 정산 등)은 이 쿠키 없이는 사용할 수 없습니다.
        이 쿠키를 교차 사이트 추적이나 광고 전달에 사용하지 않습니다.
      </p>
      <ul>
        <li><code>rouyou_token</code>: 로그인 세션 JWT, httpOnly, Secure, SameSite=Lax, 유효기간 30 일;</li>
        <li><code>rouyou_locale</code>: 언어 설정, 유효기간 1 년;</li>
        <li><code>rouyou_csrf</code>(사용 시): CSRF 방지;</li>
        <li><code>_next_*</code>: Next.js 프레임워크 내부 세션 쿠키.</li>
      </ul>

      <h3>1.2 기능 쿠키(Preferences)</h3>
      <p>시즌 테마 스위치, 게시 초안, 알림 설정 등 비필수 설정을 기억하는 데 사용합니다.</p>
      <ul>
        <li>시즌 테마 비활성 목록(localStorage);</li>
        <li>쿠키 동의 기록(localStorage);</li>
        <li>UI 선호(리스트/카드 뷰, 테마 색상 등).</li>
      </ul>

      <h3>1.3 분석 쿠키(Analytics)</h3>
      <p>
        페이지 조회수, 체류 시간, 버튼 클릭 등 이용 패턴을 파악하기 위해 사용합니다.
        데이터는 비식별화·집계 처리되며 제품 개선 용도로만 사용하고 개인을 역추적하지 않습니다.
      </p>
      <ul>
        <li>성능 모니터링(페이지 로드 시간, API 응답 시간);</li>
        <li>행동 통계(익명화된 접근 경로와 기능 사용률).</li>
      </ul>

      <h3>1.4 광고 쿠키(Advertising)</h3>
      <p>
        관련성이 더 높은 광고 콘텐츠를 표시하거나 광고 효과를 측정하기 위해 사용합니다. 현재 본 서비스는 제 3 자 광고를 제공하지 않으므로
        이 카테고리는 <strong>자리 표시자이며 실제로 사용되지 않습니다</strong>. 향후 도입할 경우 본 정책을 업데이트하고 다시 동의를 요청합니다.
      </p>

      <h2>2. 동의 및 변경</h2>
      <p>처음 방문 시 페이지 하단에 동의 바가 표시되며 다음과 같이 선택할 수 있습니다:</p>
      <ul>
        <li><strong>모두 수락</strong>: 4 개 카테고리 모두 활성화;</li>
        <li><strong>필수만</strong>: 필수 쿠키만 활성화, 나머지는 비활성화;</li>
        <li><strong>사용자 지정</strong>: 카테고리별로 개별 선택.</li>
      </ul>
      <p>
        선택 내용은 localStorage(키 <code>rouyou.cookieConsent.v1</code>)에 6 개월간 기록되며 만료 후 다시 물어봅니다.
        언제든지 &quot;설정 → 외관 및 언어&quot; 페이지에서 변경할 수 있습니다.
      </p>

      <h2>3. 제 3 자 쿠키</h2>
      <p>
        현재 제 3 자 쿠키를 사용하지 않습니다. 사이트 내에서 외부 링크(예: Wikimedia 이미지 소스)로 이동하는 경우
        해당 외부 사이트는 자체 개인정보 보호 및 쿠키 정책의 적용을 받으며 본 정책과는 무관합니다.
      </p>

      <h2>4. 쿠키 비활성화 방법</h2>
      <p>
        사이트의 동의 바 외에 브라우저에서 쿠키를 개별적으로 차단하거나 삭제할 수 있습니다.
        &quot;필수&quot; 쿠키를 비활성화하면 로그인 또는 거래 기능을 사용할 수 없게 되는 점을 유의해 주십시오.
      </p>

      <h2>5. 문의</h2>
      <p>쿠키 사용 방식에 대한 문의는 <code>support@rouyou.example</code> 로 연락해 주십시오.</p>

      <hr />
      <p className="text-xs text-leaf-500">Demo 버전이며, 법률 자문을 구성하지 않습니다.</p>
    </>
  );
}
