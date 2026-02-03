const Payee = require('../../models/Payee');

const payeeResolvers = {
    Mutation:{
        categorizePayee: async (_,{payeeId,category}) =>{
            const payee = await Payee.findById(payeeId);
            console.log('Found payee:', payee);
            if(!payee){
                throw new Error('Payee not found');
            }
            payee.category = category;
            payee.confidence = 0.9; // user-confirmed
            await payee.save();
            return payee;
        }
    }
}

module.exports = payeeResolvers;