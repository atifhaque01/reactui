import TreeConstructor from './TreeConstructor';
import PageHeader from './Components/PageHeader';
import SlideInForm from './Components/SlideInForm';

export default function App() {
  return (
    <div>
      <div>
        <PageHeader />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '5px' }}>
        <SlideInForm members={['Atif', 'Adil']} />
      </div>
      <div>
        <TreeConstructor />
      </div>
    </div>
  );
}
