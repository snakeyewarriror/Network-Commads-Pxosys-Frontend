import Layout from '../base/BaseLayout';

import FormRegister from '../forms/FormRegister';

const Register = () => {

  return (
    <Layout title="Pxosys">
      <div className="text-center mt-5">
        <FormRegister route="/register/" method="register" />
      </div>
    </Layout>
  )
}

export default Register
