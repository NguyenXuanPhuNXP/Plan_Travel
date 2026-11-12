import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { DESTINATION_PLACEHOLDER, destinationImage, handleImageError } from '../../utils/destinationImages';
import './PlannerIntro.css';

export default function PlannerIntro({ destination, manual = false }) {
  const chosenImage = destinationImage(destination);
  const image = chosenImage === DESTINATION_PLACEHOLDER ? destinationImage('Hạ Long') : chosenImage;
  const caption = chosenImage === DESTINATION_PLACEHOLDER ? 'Vịnh Hạ Long' : destination;
  return <aside className="planner-intro">
    <h1>Chuyến đi,<br />theo cách bạn.</h1>
    <p>{manual ? 'Tự chọn từng điểm dừng, sắp xếp lịch trình và cùng bạn bè chuẩn bị cho chuyến đi.' : 'Kể cho PlanTravel nơi bạn muốn đến. AI gợi ý hành trình, bạn quyết định những trải nghiệm của mình.'}</p>
    <figure><img src={image} alt={`Khung cảnh ${caption}`} width="960" height="720" onError={handleImageError} /><figcaption><MapPin size={16} /> Cảm hứng từ {caption}, Việt Nam</figcaption></figure>
    <Link className="planner-explore-link" to="/explore">Tìm cảm hứng từ những điểm đến</Link>
  </aside>;
}
