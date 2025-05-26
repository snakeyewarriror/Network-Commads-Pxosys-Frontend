import Layout from '../base/BaseLayout';

import FormLogin from '../forms/FormLogin';

const Login = () => {

  return (
    <Layout title="Pxosys">
      <div className="text-center mt-5">
        <h5>
          <FormLogin route="/token/" method="login" />
        </h5>
      </div>
    </Layout>
  )
}

export default Login
