import View from './view';
import { value } from '../env';
export default function Page() { return <><p id="server">{value()}</p><View /></>; }
