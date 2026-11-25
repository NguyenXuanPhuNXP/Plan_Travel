import './BrandMascot.css';

export default function BrandMascot() {
  return (
    <svg className="brand-mascot" viewBox="0 0 112 120" width="84" height="90" aria-hidden="true">
      <path fill="#14342b" fillRule="evenodd" d="M29 7C11 7 6 16 6 33V97Q6 113 22 113H28Q42 113 42 98V87Q42 84 46 84H59C89 84 105 71 105 45C105 19 91 7 65 7ZM44 35C36 35 34 40 34 49V55Q34 65 45 65C63 65 78 62 78 50C78 38 72 35 60 35Z" />
      <g className="brand-mascot-eyes" fill="#faf8f2">
        <ellipse cx="47" cy="24" rx="3.2" ry="4.2" />
        <ellipse cx="65" cy="23" rx="3.2" ry="4.2" />
      </g>
    </svg>
  );
}
