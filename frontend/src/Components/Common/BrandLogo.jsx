import './BrandLogo.css';

export default function BrandLogo() {
  return (
    <span className="brand-logo">
      <img src="/images/brand/plantravel-lockup.png" alt="plantravel." />
      <img className="brand-logo-accent" src="/images/brand/plantravel-lockup.png" alt="" aria-hidden="true" />
    </span>
  );
}
