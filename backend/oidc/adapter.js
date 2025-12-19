const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: String,
  data: Object,
  expiresAt: Date,
  consumedAt: Date,
}, { timestamps: true });

const OIDCModel = mongoose.model('OIDCModel', schema);

class MongoAdapter {
  constructor(name) {
    this.name = name;
  }

  async upsert(id, payload, expiresIn) {
    let expiresAt;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + (expiresIn * 1000));
    }

    await OIDCModel.updateOne(
      { _id: `${this.name}:${id}` },
      {
        data: payload,
        ...(expiresAt ? { expiresAt } : {}),
      },
      { upsert: true }
    );
  }

  async find(id) {
    const found = await OIDCModel.findOne({ _id: `${this.name}:${id}` });
    if (!found) return undefined;
    return found.data;
  }

  async findByUserCode(userCode) {
    const found = await OIDCModel.findOne({ 'data.userCode': userCode });
    if (!found) return undefined;
    return found.data;
  }

  async findByUid(uid) {
    const found = await OIDCModel.findOne({ 'data.uid': uid });
    if (!found) return undefined;
    return found.data;
  }

  async consume(id) {
    await OIDCModel.updateOne(
      { _id: `${this.name}:${id}` },
      { consumedAt: new Date() }
    );
  }

  async destroy(id) {
    await OIDCModel.deleteOne({ _id: `${this.name}:${id}` });
  }

  async revokeByGrantId(grantId) {
    await OIDCModel.deleteMany({ 'data.grantId': grantId });
  }
}

module.exports = MongoAdapter;
