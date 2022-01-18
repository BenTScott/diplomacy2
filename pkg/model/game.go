package model

type Game struct {
	ID    string   `json:"id,omitempty"`
	Users []string `json:"users,omitempty"`
}

func (t Game) Key() string {
	return t.ID
}
