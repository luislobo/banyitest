import React, {useState, useEffect} from 'react';
import {OAuth2Popup, useOAuth2} from '@tasoskakour/react-use-oauth2';
import axios from 'axios';
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
} from 'react-router-dom';

import './App.scss';

const baseOAuthURL = 'https://www.bungie.net/en/oauth/authorize';
const tokenEndpoint = 'https://www.bungie.net/platform/app/oauth/token/'
const appDomain = process.env.VERCEL_URL;
const redirectURL = `https://${appDomain}/callback`;

const bungieApi = axios.create({
  baseURL: 'https://www.bungie.net/api/Destiny2',
  headers: [{'X-API-Key': process.env.BUNGIE_API_KEY}],
});

function Home() {
  const {data, loading, error, getAuth} = useOAuth2({
    authorizeUrl: baseOAuthURL,
    clientId: process.env.BUNGIE_CLIENT_ID || '33017',
    redirectUri: `${document.location.origin}/callback`,
    scope: 'ReadBasicUserProfile,MoveEquipDestinyItems,ReadDestinyInventoryAndVault,ReadUserData',
    responseType: 'code',
    exchangeCodeForTokenServerURL: tokenEndpoint,
    exchangeCodeForTokenMethod: 'POST',
    onSuccess: (payload) => console.log('Success', payload),
    onError: (error_) => console.log('Error', error_),
  });

  const isLoggedIn = Boolean(data?.access_token); // or whatever...

  if (error) {
    return <div>Error</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isLoggedIn) {
    return <pre>{JSON.stringify(data)}</pre>;
  }

  return (
      <div className="App">
        <button style={{margin: '24px'}} type="button"
                onClick={() => getAuth()}>
          Login with Bungie.net
        </button>
      </div>
  );
}

const Callback = () => {
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    const getAccessToken = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (!code) return;

        const response = await axios.post(
            'https://www.bungie.net/platform/app/oauth/token/',
            {
              client_id: '33017',
              client_secret: 'your_client_secret',
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: redirectURL,
            },
        );
        setAccessToken(response.data.access_token);
      } catch (error) {
        console.error(error);
      }
    };

    getAccessToken();
  }, []);

  return <Navigate to={{pathname: '/profile', state: {accessToken}}}/>;
};

const Profile = ({location}) => {
  const [profile, setProfile] = useState(null);
  const accessToken = location?.state?.accessToken;

  useEffect(() => {
    bungieApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    bungieApi
        .get('/Profile/{membershipType}/{membershipId}/')
        .then(response => {
          setProfile(response.data);
        })
        .catch(error => {
          console.error(error);
        });
  }, [accessToken]);

  return (
      <div>
        {profile ? (
            <div>
              <p>Username: {profile.username}</p>
              <p>Membership ID: {profile.membershipId}</p>
            </div>
        ) : (
            <p>Loading...</p>
        )}
      </div>
  );
};

function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route exact path="/" element={<Home/>}/>
          <Route exact path="/callback" element={<Callback/>}/>
          <Route exact path="/profile" element={<Profile/>}/>
          <Route path="*" element={<Navigate to="/"/>}
          />
        </Routes>
      </BrowserRouter>
  );
}

export default App;
