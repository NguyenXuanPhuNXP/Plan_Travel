import './PageLoader.css';
import BrandMascot from './BrandMascot';

export default function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Đang tải trang">
      <div className="page-loader-art" aria-hidden="true">
        <BrandMascot />
        <div className="page-loader-dots"><i /><i /><i /></div>
      </div>
    </div>
  );
}
