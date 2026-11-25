import { useId } from 'react';
import { suggestVietnamDestinations } from '../../utils/vietnamDestinations';

export default function DestinationInput({ value, onChange, nativeSuggestions = true, ...props }) {
  const id = useId();
  return <>
    <input {...props} autoComplete="off" list={nativeSuggestions ? id : undefined} value={value} onChange={onChange} />
    {nativeSuggestions && <datalist id={id}>{suggestVietnamDestinations(value).map(name => <option key={name} value={name} />)}</datalist>}
  </>;
}
