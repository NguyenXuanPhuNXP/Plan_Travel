import { useId } from 'react';
import { suggestVietnamDestinations } from '../../utils/vietnamDestinations';

export default function DestinationInput({ value, onChange, ...props }) {
  const id = useId();
  return <>
    <input {...props} autoComplete="off" list={id} value={value} onChange={onChange} />
    <datalist id={id}>{suggestVietnamDestinations(value).map(name => <option key={name} value={name} />)}</datalist>
  </>;
}
