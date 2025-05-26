import { Link } from 'react-router-dom'
import Layout from '../base/BaseLayout'

const HomePage = () => {

  return (
    <Layout title="Pxosys">
      <div className="text-center mt-5">
        <h5>
          Get access to information about all things networking and cybersecurity!
        </h5>
        <br />
        <p>
          Help the community by adding to our list of commands
        </p>
        <br />
        <Link to="/commands" className="btn btn-success"><i className="fa fa-angle-right" aria-hidden="true"></i>Go to Commands</Link>
      </div>
    </Layout>
  )
}

export default HomePage
